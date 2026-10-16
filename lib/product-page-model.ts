import type { CatalogProduct } from './catalog-model.ts';

export const RECENT_PRODUCTS_KEY = 'goelec:recent-products';
export function recentProductIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))].slice(0, 10) : [];
}
export function rememberProduct(ids: unknown, current: string) {
  return recentProductIds([current, ...recentProductIds(ids).filter((id) => id !== current)]);
}
export function rankSimilarProducts(products: CatalogProduct[], current: CatalogProduct) {
  return products.filter((p) => p.id !== current.id && p.categoryIds.some((id) => current.categoryIds.includes(id)))
    .sort((a, b) => Number(b.categoryIds.includes(current.category?.id ?? '')) - Number(a.categoryIds.includes(current.category?.id ?? ''))).slice(0, 8);
}
export function productShareLinks(url: string, name: string) {
  return { facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${name}\n${url}`)}` };
}
