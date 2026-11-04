import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getSocialProduct } from '@/lib/product-social-catalog';
import { productShareSources } from '@/lib/product-sharing';
import { getProductSocialJpeg } from '@/lib/product-social-image-server';
import { createPublicPreviewCache, publicPreviewCacheKey } from '@/lib/public-preview-cache';

export const runtime = 'nodejs';
type Context = {params: Promise<{slug: string}>};
class PreviewNotFound extends Error {}
// Recheck public product/source state every 30s via the shared lightweight lookup.
// Encoded bytes are retained for an hour, keyed by actual product/source identity.
const previews = createPublicPreviewCache<{bytes: Buffer; etag: string; catalogMs: number; jpegMs: number}>(32, 3600000);
async function respond(request: NextRequest, {params}: Context, head: boolean) {
  const started = performance.now();
  try {
    const {slug} = await params;
    const lookup = performance.now();
    const lookupResult = await getSocialProduct(slug);
    const product = lookupResult?.value;
    if (!product) throw new PreviewNotFound();
    const sources = productShareSources(product);
    const key = publicPreviewCacheKey(slug, request.nextUrl.searchParams.get('v'))
      + createHash('sha256').update(JSON.stringify([product.id, product.revision, sources])).digest('hex');
    const cached = await previews.get(key, async () => {
      const catalogMs = performance.now() - lookup, converting = performance.now();
      const bytes = await getProductSocialJpeg(`${product.id}:${product.revision}`, sources);
      return {bytes, etag: `"${createHash('sha256').update(bytes).digest('hex')}"`, catalogMs, jpegMs: performance.now() - converting};
    });
    const {bytes, etag, catalogMs, jpegMs} = cached.value;
    const timing = `preview;dur=${(performance.now() - started).toFixed(1)};desc="${cached.status}"`
      + (cached.status === 'miss' ? `, catalog;dur=${catalogMs.toFixed(1)}, jpeg;dur=${jpegMs.toFixed(1)}` : '');
    const headers = {'Content-Type': 'image/jpeg', 'Content-Length': String(bytes.length), 'Content-Disposition': request.nextUrl.searchParams.get('download') === 'instagram'
        ? `attachment; filename="go-elec-produit.jpg"; filename*=UTF-8''${encodeURIComponent(slug + '.jpg')}`
        : 'inline; filename="go-elec-produit.jpg"',
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'index, follow, max-image-preview:large', 'Server-Timing': timing, ETag: etag};
    if (request.headers.get('if-none-match') === etag) return new Response(null, {status: 304, headers});
    return new Response(head ? null : new Uint8Array(bytes), {status: 200, headers});
  } catch (error) {
    if (error instanceof PreviewNotFound) return new Response(null, {status: 404, headers: {'Cache-Control': 'no-store'}});
    console.error('[GO ELEC product social image]', 'image_unavailable');
    return new Response(null, {status: 503, headers: {'Cache-Control': 'no-store', 'Retry-After': '60'}});
  }
}
export async function GET(request: NextRequest, context: Context) { return respond(request, context, false); }
export async function HEAD(request: NextRequest, context: Context) { return respond(request, context, true); }
