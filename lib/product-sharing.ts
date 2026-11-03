import { createHash } from 'node:crypto';
import type { Metadata } from 'next';
import type { CatalogProduct } from './catalog-model';
import { canonicalProductUrl, STOREFRONT_ORIGIN } from './product-url.js';

export { STOREFRONT_ORIGIN } from './product-url.js';
export const DEFAULT_PRODUCT_SHARE_IMAGE = `${STOREFRONT_ORIGIN}/branding/goelec_electrical_security_logo.png`;
type ShareProduct = Pick<CatalogProduct, 'name' | 'slug' | 'brand' | 'sku' | 'imageUrl' | 'images' | 'shortDescription' | 'description'>;
export const PRODUCT_SHARE_WIDTH = 1200;
export const PRODUCT_SHARE_HEIGHT = 630;
export type ImageAvailability = 'available' | 'missing' | 'unknown';

export function absoluteShareImage(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim(), STOREFRONT_ORIGIN);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}
/** The catalogue gallery already puts the stored main image first. */
export function productShareSources(product: ShareProduct): string[] {
  return [...new Set([...product.images.map(image => image.url), product.imageUrl].map(absoluteShareImage).filter((url): url is string => !!url))];
}
export function productSocialPreviewUrl(slug: string, source: string): string {
  const revision = createHash('sha256').update(`jpeg-v1:${source}`).digest('hex').slice(0, 16);
  return `${STOREFRONT_ORIGIN}/produit/${encodeURIComponent(slug)}/partage.jpg?v=${revision}`;
}
export async function productShareImage(product: ShareProduct, check: (url: string) => Promise<ImageAvailability>): Promise<string> {
  const candidates = productShareSources(product);
  let uncertain: string | null = null;
  for (const url of candidates) {
    let status: ImageAvailability = 'unknown';
    try { status = await check(url); } catch { /* A temporary outage must not replace a real photo with the site logo. */ }
    if (status === 'available') return url;
    if (status === 'unknown') uncertain ??= url;
  }
  return uncertain ?? DEFAULT_PRODUCT_SHARE_IMAGE;
}
export function productShareDescription(product: ShareProduct): string {
  const plain = (value: string | null) => (value || '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt);/gi, entity => ({'&nbsp;':' ', '&amp;':'&', '&quot;':'"', '&apos;':"'", '&lt;':'<', '&gt;':'>'}[entity.toLowerCase()]!))
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => { const n = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code); return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''; })
    .replace(/\s+/g, ' ').trim();
  const description = plain(product.shortDescription) || plain(product.description) || `${product.name}${product.brand ? ` — ${product.brand}` : ''}${product.sku ? ` · Réf. ${product.sku}` : ''}. Découvrez ce produit chez GO ELEC.`;
  return description.length > 220 ? `${description.slice(0, 217).trimEnd()}…` : description;
}
export function productSharingMetadata(product: ShareProduct, image: string): Metadata {
  const url = canonicalProductUrl(product.slug);
  const description = productShareDescription(product);
  const preview = productSocialPreviewUrl(product.slug, image);
  return {
    title: product.name,
    description,
    alternates: {canonical: url},
    openGraph: {type: 'website', siteName: 'GO ELEC', locale: 'fr_MA', title: product.name, description, url, images: [{url: preview, secureUrl: preview, type: 'image/jpeg', width: PRODUCT_SHARE_WIDTH, height: PRODUCT_SHARE_HEIGHT, alt: product.name}]},
    twitter: {card: 'summary_large_image', title: product.name, description, images: [{url: preview, alt: product.name}]},
  };
}

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function productSocialHtml(product: ShareProduct) {
  // Same shared metadata builder as the visible product template; no source HEAD probes.
  // The JPEG renderer itself selects the first valid main/gallery photo.
  const metadata = productSharingMetadata(product, productShareSources(product)[0] ?? DEFAULT_PRODUCT_SHARE_IMAGE);
  const og = metadata.openGraph as {title:string;description:string;url:string;images:{url:string}[]};
  const image = og.images[0].url;
  const tag=(property:string,content:unknown)=>`<meta property="${property}" content="${escape(content)}">`;
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
    + `<title>${escape(product.name)} | GO ELEC</title><meta name="description" content="${escape(og.description)}"><link rel="canonical" href="${escape(og.url)}">`
    + tag('og:type','website')+tag('og:site_name','GO ELEC')+tag('og:locale','fr_MA')+tag('og:title',product.name)+tag('og:description',og.description)+tag('og:url',og.url)
    + tag('og:image',image)+tag('og:image:secure_url',image)+tag('og:image:type','image/jpeg')+tag('og:image:width',1200)+tag('og:image:height',630)+tag('og:image:alt',product.name)
    + `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(product.name)}"><meta name="twitter:description" content="${escape(og.description)}"><meta name="twitter:image" content="${escape(image)}"><meta name="twitter:image:alt" content="${escape(product.name)}">`
    + `</head><body><h1>${escape(product.name)}</h1><p>${escape(og.description)}</p><img src="${escape(image)}" alt="${escape(product.name)}"></body></html>`;
}
