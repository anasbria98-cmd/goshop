
export type SocialProductRow = {updated_at?: string; id: string; name: string; slug: string; sku: string; main_image_url: string | null;
  short_description: string | null; description: string | null; brands: {name: string} | null;
  product_images: {storage_path: string; sort_order: number}[]};
export function socialProduct(row: SocialProductRow, base: string) {
  const absolute = (path: string) => /^https?:\/\//.test(path) ? path : `${base}/storage/v1/object/public/product-images/${path}`;
  const sources = [...new Set([row.main_image_url, ...[...row.product_images].sort((a,b)=>a.sort_order-b.sort_order).map(i=>i.storage_path)].filter((s): s is string => !!s).map(absolute))];
  return {id: row.id, revision: row.updated_at ?? '', name: row.name, slug: row.slug, sku: row.sku, brand: row.brands?.name ?? '',
    shortDescription: row.short_description, description: row.description, imageUrl: sources[0] ?? null,
    images: sources.map(url=>({url,alt:row.name}))};
}
export function socialCrawlerPath(path: string, agent: string, method: string, rsc: boolean) {
  // Do not alter ordinary browsers, search-engine crawlers, RSC or authenticated actions.
  return ['GET','HEAD'].includes(method) && !rsc && /^(?:.*\b)?(?:WhatsApp|facebookexternalhit|Facebot)(?:[\/\s;]|$)/i.test(agent)
    && /^\/produit\/[^/]+\/?$/.test(path);
}
