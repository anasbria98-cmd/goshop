export type QuoteUpload = {name: string; type: string; bytes: Uint8Array; path: string};
export type QuoteClaim = 'claimed' | 'saved' | 'busy' | 'mismatch' | 'limited';
export type QuoteAttachment = {name: string; path: string; type: string; size: number};
/** Dependencies keep local tests isolated from production Supabase and email. */
export async function processQuoteRequest({id, files, claim, upload, complete, fail, notify}: {
  id: string; files: QuoteUpload[];
  claim: () => Promise<QuoteClaim>; upload: (file: QuoteUpload) => Promise<void>;
  complete: (files: QuoteAttachment[]) => Promise<void>; fail: () => Promise<void>; notify: () => Promise<void>;
}) {
  const state = await claim();
  if (state === 'saved') return {ok: true as const, id};
  if (state !== 'claimed') return {ok: false as const, state};
  try {
    for (const file of files) await upload(file);
    await complete(files.map(f => ({name: f.name, path: f.path, type: f.type, size: f.bytes.length})));
  } catch {
    await fail().catch(() => {});
    return {ok: false as const, state: 'failed' as const};
  }
  // Notification is best effort and must never change a saved request into an error.
  await notify().catch(() => {});
  return {ok: true as const, id};
}
