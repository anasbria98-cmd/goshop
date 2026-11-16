import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogView } from '@/components/catalog-view';
import { getBrandPage } from '@/lib/brand-pages';
import { brandPageCopy } from '@/lib/brand-page-model';
import { DEFAULT_PRODUCT_SHARE_IMAGE, productShareSources, productSocialPreviewUrl } from '@/lib/product-sharing';

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const page = await getBrandPage(slug);
  if (!page) notFound();
  const copy = brandPageCopy(page.brand, page.products, page.categories);
  const canonical = `https://www.goelec.ma/marque/${encodeURIComponent(slug)}`;
  const product = page.products.find(product => productShareSources(product).length);
  const source = product && productShareSources(product)[0];
  const image = product && source ? productSocialPreviewUrl(product.slug, source) : DEFAULT_PRODUCT_SHARE_IMAGE;
  return {
    title: copy.title, description: copy.description,
    alternates: { canonical },
    robots: { index: Object.keys(await searchParams ?? {}).length === 0, follow: true },
    openGraph: { type: 'website' as const, title: copy.title, description: copy.description, url: canonical, siteName: 'GO ELEC', images: [{ url: image, alt: page.brand.name }] },
    twitter: { card: 'summary_large_image' as const, title: copy.title, description: copy.description, images: [image] },
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getBrandPage(slug);
  if (!page) notFound();
  const { brand, products, categories } = page;
  const copy = brandPageCopy(brand, products, categories);
  const url = `https://www.goelec.ma/marque/${encodeURIComponent(slug)}`;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.goelec.ma/' },
        { '@type': 'ListItem', position: 2, name: brand.name, item: url },
      ] },
      { '@type': 'CollectionPage', '@id': url, url, name: copy.h1, description: copy.description,
        about: { '@type': 'Brand', name: brand.name },
        mainEntity: { '@type': 'ItemList', numberOfItems: products.length, itemListElement: products.map((product, index) => ({ '@type': 'ListItem', position: index + 1, name: product.name, url: `https://www.goelec.ma/produit/${encodeURIComponent(product.slug)}` })) },
      },
    ],
  };
  const content = <div className="category-description">
    <p>{copy.intro}</p>
    {copy.appareillage && <p>Pour l’<Link className="text-link" href={`/categorie/${copy.appareillage.path}`}>appareillage {brand.name}</Link>{copy.ranges.length ? <>, explorez les gammes {copy.ranges.map((range, index) => <span key={range.id}>{index > 0 ? ', ' : ''}<Link className="text-link" href={`/categorie/${range.path}`}>{range.name}</Link></span>)}</> : null}.</p>}
    {copy.families.length > 0 && <p>Retrouvez également les références {brand.name} présentes dans les catégories {copy.families.map((family, index) => <span key={family.id}>{index > 0 ? ', ' : ''}<Link className="text-link" href={`/categorie/${family.path}`}>{family.label}</Link></span>)}. Comparez les références et les caractéristiques indiquées sur chaque fiche produit.</p>}
  </div>;
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} /><Suspense><CatalogView title={copy.h1} categories={categories} products={products} categoryContent={content} /></Suspense></>;
}
