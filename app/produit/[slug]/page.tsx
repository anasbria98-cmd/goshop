import { cache } from "react";
import { productShareImage, productSharingMetadata } from "@/lib/product-sharing";
import { productShareImageChecker } from "@/lib/product-sharing-server";
import { notFound } from "next/navigation";
import { getProductBySlug, getProducts, getStorefrontBrands } from "@/lib/catalog";
import { BrandsSection } from "@/components/brands-section";
import { ProductDetail } from "@/components/product-detail";
import { getProductReviews } from "@/lib/product-reviews";
import { rankSimilarProducts } from "@/lib/product-page-model";
import { ProductReviews, ProductRecommendations, RecentlyViewed } from "@/components/product-page-extras";

const getPageProduct = cache(getProductBySlug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getPageProduct(slug);
  if (!product) return { title: "Produit" };
  const image = await productShareImage(product, productShareImageChecker());
  return productSharingMetadata(product, image);
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getPageProduct(slug);
  if (!product) notFound();
  const productUrl = `https://www.goelec.ma/produit/${encodeURIComponent(product.slug)}`;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description || product.name,
    sku: product.sku,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(product.imageUrl ? { image: [product.imageUrl] } : {}),
    url: productUrl,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "MAD",
      price: product.price,
      availability: product.stock > 0 || product.allowBackorder
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
  const [reviewData, candidates, brands] = await Promise.all([
    getProductReviews(product.id),
    product.categoryIds.length ? Promise.all([
      getProducts({ categoryIds: product.category ? [product.category.id] : product.categoryIds, excludeId: product.id, limit: 8 }),
      product.categoryIds.length > 1 ? getProducts({ categoryIds: product.categoryIds, excludeId: product.id, limit: 8 }) : Promise.resolve([]),
    ]).then((groups) => [...new Map(groups.flat().map((p) => [p.id, p])).values()]) : Promise.resolve([]),
    getStorefrontBrands(),
  ]);
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }} /><ProductDetail key={product.id} product={product} /><div className="wrap detail-page-extras">
    <ProductReviews key={product.id} productId={product.id} slug={product.slug} {...reviewData} />
    <ProductRecommendations title="Articles similaires" products={rankSimilarProducts(candidates, product)} />
    <RecentlyViewed productId={product.id} />
  </div><BrandsSection brands={brands} /></>;
}
