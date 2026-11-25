// Editorial metadata for the five GSC "crawled, not indexed" products.
// Verified against the published catalogue on 2026-11-25. SKU guards prevent
// applying reference-specific copy if a slug is later reused for another item.
const entries = [
  {
    slug: 'lazer-magnetique-12w', sku: 'GS1020',
    title: 'Module LED Lazer magnétique 12 W GS1020',
    description: 'Module LED Lazer magnétique de 12 W, référence GS1020, pour rail magnétique. Consultez la fiche et les caractéristiques publiées sur GO ELEC.',
  },
  {
    slug: 'panel-led-rond-encastre-36w-ajustable', sku: 'GOLED5301',
    title: 'Panel LED rond encastré 36 W ajustable Goled GOLED5301',
    description: 'Panel LED rond encastré ajustable Goled de 36 W, référence GOLED5301. Retrouvez sa description et les informations produit sur GO ELEC.',
  },
  {
    slug: 'hager-interrupteur-differentiel-sanvis-63a-30ma-type-a-auto-230v-cds765f', sku: 'CDS765F',
    title: 'Hager CDS765F : interrupteur différentiel 63 A 30 mA type A',
    description: 'Interrupteur différentiel Hager SanVis CDS765F : 63 A, 30 mA, type A, 230 V et 2 modules. Consultez la fiche produit GO ELEC.',
  },
  {
    slug: 'moniteur-7-cdv-70h2-silver', sku: 'CDV-70H2',
    title: 'Moniteur vidéo Commax CDV-70H2 Silver 7 pouces',
    description: 'Moniteur intérieur Commax CDV-70H2 Silver pour visiophonie : écran couleur de 7 pouces et communication mains libres. Fiche produit GO ELEC.',
  },
  {
    slug: 'poussoir-a-bascule-lumineux-led-millenium', sku: '10928',
    title: 'Poussoir à bascule lumineux LED LAP Millenium 10928',
    description: 'Poussoir à bascule lumineux LED LAP Millenium, référence 10928. Son voyant LED permet de le repérer dans l’obscurité. Retrouvez sa fiche GO ELEC.',
  },
];

/** @param {{slug: string, sku: string}} product */
export function productIndexingSeo(product) {
  return entries.find(entry => entry.slug === product.slug && entry.sku === product.sku.trim());
}

/** Match the existing visible product breadcrumb without inventing ancestry. */
/** @param {{name: string, slug: string, category: {name: string, path: string} | null}} product */
export function productBreadcrumbSchema(product) {
  const origin = 'https://www.goelec.ma';
  const items = [
    {name: 'Accueil', url: `${origin}/`},
    ...(product.category ? [{name: product.category.name, url: `${origin}/categorie/${product.category.path.split('/').map(encodeURIComponent).join('/')}`}] : []),
    {name: product.name, url: `${origin}/produit/${encodeURIComponent(product.slug)}`},
  ];
  return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({'@type': 'ListItem', position: index + 1, name: item.name, item: item.url}))};
}
