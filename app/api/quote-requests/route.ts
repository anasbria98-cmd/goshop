import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac } from 'node:crypto';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSecretSupabaseKey } from '@/lib/env';
import { MAX_QUOTE_TOTAL_SIZE, quoteFileError, quoteFileMatchesContent, quoteRequestSchema, quoteReference } from '@/lib/quote-request';
import { processQuoteRequest, type QuoteClaim, type QuoteUpload } from '@/lib/quote-processing';
import { notifyQuoteRequest } from '@/lib/quote-delivery';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
const MAX_BODY = MAX_QUOTE_TOTAL_SIZE + 128 * 1024;
const reply = (body: unknown, status = 200) => NextResponse.json(body, {status, headers: {'Cache-Control': 'no-store'}});
const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
async function boundedForm(request: NextRequest) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw new Error('invalid_body');
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) throw new Error('too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); throw new Error('too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Response(Buffer.concat(chunks), {headers: {'Content-Type': request.headers.get('content-type')!}}).formData();
}
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  let sameOrigin = false;
  try { sameOrigin = !!origin && (origin === request.nextUrl.origin || new URL(origin).host === request.headers.get('host')); } catch { /* Invalid origins are rejected. */ }
  if (!sameOrigin) return reply({error: 'Origine de la demande invalide.'}, 403);
  try {
    const user = await getCurrentUser();
    if (!user) return reply({error: 'Connectez-vous pour demander un devis.'}, 401);
    const form = await boundedForm(request);
    if (form.get('website')) return reply({error: 'La demande n’a pas pu être envoyée.'}, 400);
    const parsed = quoteRequestSchema.safeParse(Object.fromEntries(form));
    const idResult = z.string().uuid().safeParse(form.get('request_id'));
    if (!parsed.success) return reply({error: 'Vérifiez les champs indiqués.', fields: parsed.error.flatten().fieldErrors}, 400);
    if (!idResult.success) return reply({error: 'Rechargez la page puis réessayez.'}, 400);
    const input = parsed.data, id = idResult.data;
    const selected = form.getAll('files').filter((f): f is File => f instanceof File && !!f.name);
    const fileError = quoteFileError(selected);
    if (fileError) return reply({error: fileError}, 400);
    const files: QuoteUpload[] = [];
    for (const [index, file] of selected.entries()) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!quoteFileMatchesContent(file.type, bytes)) return reply({error: 'Un fichier ne correspond pas au format annoncé. Choisissez une image JPG, PNG, WebP ou un PDF valide.'}, 400);
      const extension = {'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'application/pdf':'pdf'}[file.type];
      files.push({name: file.name.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 180), type: file.type, bytes, path: `${id}/${index}-${hash(bytes)}.${extension}`});
    }
    const admin = createSupabaseAdminClient();
    let category = 'Demande générale';
    if (input.category_id !== 'general') {
      const {data, error} = await admin.from('categories').select('name').eq('id', input.category_id).eq('is_active', true).maybeSingle();
      if (error) throw new Error('category_unavailable');
      if (!data) return reply({error: 'Cette catégorie n’est plus disponible. Choisissez un autre type de demande.'}, 400);
      category = data.name;
    }
    const payloadHash = hash(JSON.stringify({userId: user.id, input, files: files.map(f => ({name: f.name, path: f.path, type: f.type}))}));
    const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const rateKey = createHmac('sha256', getSecretSupabaseKey()).update(`quote-rate:${address}`).digest('hex');
    const result = await processQuoteRequest({id, files,
      claim: async () => {
        const {data, error} = await admin.rpc('claim_quote_request', {p_id: id, p_hash: payloadHash, p_rate_key: rateKey, p_input: {...input, category_name: category}});
        if (error || !['claimed', 'saved', 'busy', 'mismatch', 'limited'].includes(String(data))) throw new Error('save_unavailable');
        return data as QuoteClaim;
      },
      upload: async file => {
        const {error} = await admin.storage.from('quote-attachments').upload(file.path, file.bytes, {contentType: file.type, upsert: true, cacheControl: '0'});
        if (error) throw new Error('attachment_failed');
      },
      complete: async attachments => {
        const {data, error} = await admin.from('quote_requests').update({attachments, status: 'received', updated_at: new Date().toISOString()}).eq('id', id).eq('status', 'processing').select('id').single();
        if (error || !data) throw new Error('save_failed');
      },
      fail: async () => { await admin.from('quote_requests').update({status: 'failed', updated_at: new Date().toISOString()}).eq('id', id).eq('status', 'processing'); },
      notify: () => notifyQuoteRequest({key: process.env.RESEND_API_KEY, id, reference: quoteReference(id), input, category, files: files.map(f => f.name), log: code => console.error('[GO ELEC quote notification]', code)}),
    });
    if (result.ok) return reply({ok: true, id: result.id});
    if (result.state === 'limited') return reply({error: 'Trop de demandes rapprochées. Réessayez dans 15 minutes ou contactez GO ELEC.'}, 429);
    if (result.state === 'busy') return reply({error: 'Votre demande est déjà en cours de traitement. Patientez puis réessayez sans modifier le formulaire.'}, 409);
    if (result.state === 'mismatch') return reply({error: 'Cette référence a déjà été utilisée. Modifiez un champ puis renvoyez votre demande.'}, 409);
    return reply({error: 'La demande n’a pas pu être finalisée. Vos informations restent dans le formulaire : veuillez réessayer.'}, 503);
  } catch (error) {
    if (error instanceof Error && error.message === 'too_large') return reply({error: 'Les pièces jointes ne doivent pas dépasser 8 Mo au total.'}, 413);
    if (error instanceof Error && error.message === 'invalid_body') return reply({error: 'Le formulaire est invalide. Rechargez la page et réessayez.'}, 400);
    console.error('[GO ELEC quote request]', 'request_failed');
    return reply({error: 'Le service de devis est momentanément indisponible. Réessayez ou contactez GO ELEC.'}, 503);
  }
}
