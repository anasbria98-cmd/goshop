/** Shared by server metadata and client sharing; never includes visitor query/hash state. */
export const STOREFRONT_ORIGIN = 'https://www.goelec.ma';
/** @param {string} slug */
export function canonicalProductUrl(slug) {
  return `${STOREFRONT_ORIGIN}/produit/${encodeURIComponent(slug)}`;
}
