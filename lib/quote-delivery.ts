import type { QuoteRequestInput } from './quote-request.ts';

/** Server callers supply the key. No customer data or provider payload is logged. */
export async function notifyQuoteRequest({key, id, reference, input, category, files, request = fetch, log}: {
  key?: string; id: string; reference: string; input: QuoteRequestInput; category: string; files: string[];
  request?: typeof fetch; log: (code: string) => void;
}): Promise<void> {
  if (!key) { log('missing_api_key'); return; }
  const escape = (v: string) => v.replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]!));
  const lines = [`Nouvelle demande de devis GO ELEC`, `Référence : ${reference}`, `Client : ${input.first_name} ${input.last_name}`, `Téléphone : ${input.phone}`, `Email : ${input.email}`, `Catégorie : ${category}`, `Sujet : ${input.subject}`, input.message, `Pièces jointes : ${files.length ? files.join(', ') : 'Aucune'}`, 'Les pièces jointes sont privées et consultables par les personnes autorisées dans Supabase.'];
  try {
    const response = await request('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `quote-request/${id}`},
      body: JSON.stringify({from: 'GO ELEC <noreply@goelec.ma>', to: ['contact@goelec.ma'], reply_to: input.email,
        subject: `GO ELEC – Nouvelle demande de devis ${reference}`, text: lines.join('\n\n'),
        html: `<html lang="fr"><body style="margin:0;padding:24px;background:#f4f6f9;font-family:Arial,sans-serif;color:#30353b"><div style="max-width:600px;margin:auto;padding:24px;background:white;border-top:4px solid #294f9f"><h1 style="font-size:24px;color:#294f9f">Nouvelle demande de devis</h1>${lines.slice(1).map(l => `<p style="white-space:pre-wrap;line-height:1.6;overflow-wrap:anywhere">${escape(l)}</p>`).join('')}</div></body></html>`}),
    });
    if (!response.ok) log(`provider_http_${response.status}`);
  } catch { log('delivery_failed'); }
}
