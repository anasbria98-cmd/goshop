import sharp from 'sharp';

export class ProductPhotoError extends Error {
  kind: 'missing' | 'unavailable';
  constructor(kind: 'missing' | 'unavailable') { super(`Product photo ${kind}`); this.kind = kind; }
}
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
export function createProductPhotoLoader(storageOrigin: string | null, siteOrigin: string, request: typeof fetch = fetch) {
  const signal = AbortSignal.timeout(6000);
  const trusted = (url: URL) => !url.username && !url.password && (
    (url.origin === storageOrigin && url.pathname.startsWith('/storage/v1/object/public/product-images/')) ||
    (url.origin === siteOrigin && /^\/(products|branding|promotions|store|uploads)\//.test(url.pathname))
  );
  return async (source: string): Promise<Buffer> => {
    let url = new URL(source);
    for (let hop = 0; hop < 3; hop++) {
      if (!trusted(url)) throw new ProductPhotoError('unavailable');
      let response: Response;
      try { response = await request(url, {redirect: 'manual', signal, headers: {Accept: 'image/*', 'User-Agent': 'GO-ELEC-Social-Preview/1.0'}, cache: 'no-store'}); }
      catch { throw new ProductPhotoError('unavailable'); }
      if ([404, 410].includes(response.status)) { await response.body?.cancel(); throw new ProductPhotoError('missing'); }
      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        await response.body?.cancel(); url = new URL(response.headers.get('location')!, url); continue;
      }
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/') || Number(response.headers.get('content-length') || 0) > MAX_SOURCE_BYTES) {
        await response.body?.cancel(); throw new ProductPhotoError('unavailable');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new ProductPhotoError('unavailable');
      const chunks: Uint8Array[] = []; let size = 0;
      try {
        while (true) {
          const {done, value} = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > MAX_SOURCE_BYTES) { await reader.cancel(); throw new ProductPhotoError('unavailable'); }
          chunks.push(value);
        }
      } catch { throw new ProductPhotoError('unavailable'); }
      finally { reader.releaseLock(); }
      if (!size) throw new ProductPhotoError('missing');
      return Buffer.concat(chunks);
    }
    throw new ProductPhotoError('unavailable');
  };
}

/** Convert only the social copy: keep the entire real photo and its proportions. */
export async function makeProductSocialJpeg(sources: string[], fallback: string, load: (url: string) => Promise<Buffer>, width = 1200, height = 630): Promise<Buffer> {
  let temporaryFailure = false;
  const convert = async (bytes: Buffer) => {
    const image = sharp(bytes, {limitInputPixels: 40_000_000, animated: false});
    let metadata;
    try { metadata = await image.metadata(); }
    catch (error) {
      if (error instanceof Error && /unsupported image format|corrupt|invalid|truncated|premature/i.test(error.message)) throw new ProductPhotoError('missing');
      throw new ProductPhotoError('unavailable');
    }
    if (!['jpeg', 'png', 'webp', 'gif', 'avif', 'heif', 'tiff'].includes(metadata.format || '')) throw new ProductPhotoError('unavailable');
    const photo = await image.autoOrient().resize({width: width - 80, height: height - 80, fit: 'inside', withoutEnlargement: true})
      .flatten({background: '#ffffff'}).toColourspace('srgb').png().timeout({seconds: 3}).toBuffer();
    return sharp({create: {width, height, channels: 3, background: '#ffffff'}}).composite([{input: photo, gravity: 'centre'}])
      .toColourspace('srgb').jpeg({quality: 88, progressive: false, chromaSubsampling: '4:4:4'}).timeout({seconds: 3}).toBuffer();
  };
  for (const source of sources) {
    let bytes: Buffer;
    try { bytes = await load(source); }
    catch (error) { if (!(error instanceof ProductPhotoError) || error.kind !== 'missing') temporaryFailure = true; continue; }
    try { return await convert(bytes); }
    catch (error) { if (!(error instanceof ProductPhotoError) || error.kind !== 'missing') temporaryFailure = true; }
  }
  // Do not cache a generic logo when a genuine product photo has a transient failure.
  if (temporaryFailure) throw new ProductPhotoError('unavailable');
  return convert(await load(fallback));
}
