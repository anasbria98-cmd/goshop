import type { CatalogCategory, CatalogProduct } from './catalog-model';

// Deliberate rollout: other brand routes stay unavailable until their own audit/approval.
export const enabledBrandPages: readonly string[] = ['lap'];
export function brandLandingPath(slug: string) {
  return enabledBrandPages.includes(slug) ? `/marque/${encodeURIComponent(slug)}` : null;
}
export function brandSitemapSlugs(products: Pick<CatalogProduct, 'brandSlug'>[]) {
  return enabledBrandPages.filter(slug => products.some(product => product.brandSlug === slug));
}
export type LandingBrand = { id: string; name: string; slug: string; description: string | null; seo_title: string | null; seo_description: string | null; logo_url: string | null };
export function brandPageCopy(brand: LandingBrand, products: CatalogProduct[], categories: CatalogCategory[]) {
  const assigned = new Set(products.flatMap(product => product.categoryIds));
  const populated = (path: string) => categories.find(category => category.path === path && categories.some(child => (child.path === path || child.path.startsWith(`${path}/`)) && assigned.has(child.id)));
  const ranges = ['millenium', 'galaxy', 'aqua', 'optimo'].flatMap(slug => {
    const category = populated(`appareillage/${brand.slug}/${slug}`);
    return category ? [category] : [];
  });
  const families = [
    ['materiel-electrique/coffret-electrique', 'coffrets électriques'],
    ['eclairage/interieur/douille', 'douilles'],
    ['gaines-conduits/fixation', 'fixations'],
  ].flatMap(([path, label]) => { const category = populated(path); return category ? [{ ...category, label }] : []; });
  return {
    title: brand.seo_title?.trim() || `${brand.name} au Maroc : appareillage et matériel électrique`,
    description: brand.seo_description?.trim() || `Découvrez le catalogue ${brand.name} chez GO ELEC au Maroc${ranges.length ? ` : gammes ${ranges.map(range => range.name).join(', ')}` : ''}${families.length ? `, ${families.map(family => family.label).join(', ')}` : ''}. Comparez les références.`,
    h1: `${brand.name} : catalogue de matériel électrique au Maroc`,
    intro: brand.description?.trim() || `Découvrez les produits ${brand.name} disponibles chez GO ELEC au Maroc. Cette page rassemble l’ensemble de la sélection ${brand.name} du catalogue, au-delà de l’appareillage électrique.`,
    appareillage: populated(`appareillage/${brand.slug}`), ranges, families,
  };
}
