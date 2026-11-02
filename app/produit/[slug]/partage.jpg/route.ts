import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getProductBySlug } from '@/lib/catalog';
import { productShareSources } from '@/lib/product-sharing';
import { getProductSocialJpeg } from '@/lib/product-social-image-server';

export const runtime = 'nodejs';
type Context = {params: Promise<{slug: string}>};
async function respond(request: NextRequest, {params}: Context, head: boolean) {
  try {
    const {slug} = await params;
    const product = await getProductBySlug(slug);
    if (!product) return new Response(null, {status: 404, headers: {'Cache-Control': 'no-store'}});
    const bytes = await getProductSocialJpeg(product.id, productShareSources(product));
    const etag = `"${createHash('sha256').update(bytes).digest('hex')}"`;
    const headers = {'Content-Type': 'image/jpeg', 'Content-Length': String(bytes.length), 'Content-Disposition': 'inline; filename="go-elec-produit.jpg"',
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'index, follow, max-image-preview:large', ETag: etag};
    if (request.headers.get('if-none-match') === etag) return new Response(null, {status: 304, headers});
    return new Response(head ? null : new Uint8Array(bytes), {status: 200, headers});
  } catch {
    console.error('[GO ELEC product social image]', 'image_unavailable');
    return new Response(null, {status: 503, headers: {'Cache-Control': 'no-store', 'Retry-After': '60'}});
  }
}
export async function GET(request: NextRequest, context: Context) { return respond(request, context, false); }
export async function HEAD(request: NextRequest, context: Context) { return respond(request, context, true); }
