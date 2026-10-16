import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/catalog";
import { ProductDetail } from "@/components/product-detail";
import { getProductReviews } from "@/lib/product-reviews";
import { rankSimilarProducts } from "@/lib/product-page-model";
import { ProductReviews, ProductRecommendations, RecentlyViewed } from "@/components/product-page-extras";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product?.name || "Produit", description: product?.shortDescription || undefined };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [reviewData, candidates] = await Promise.all([
    getProductReviews(product.id),
    product.categoryIds.length ? Promise.all([
      getProducts({ categoryIds: product.category ? [product.category.id] : product.categoryIds, excludeId: product.id, limit: 8 }),
      product.categoryIds.length > 1 ? getProducts({ categoryIds: product.categoryIds, excludeId: product.id, limit: 8 }) : Promise.resolve([]),
    ]).then((groups) => [...new Map(groups.flat().map((p) => [p.id, p])).values()]) : Promise.resolve([]),
  ]);
  return <><ProductDetail key={product.id} product={product} /><div className="wrap detail-page-extras">
    <ProductReviews key={product.id} productId={product.id} slug={product.slug} {...reviewData} />
    <ProductRecommendations title="Articles similaires" products={rankSimilarProducts(candidates, product)} />
    <RecentlyViewed productId={product.id} />
  </div></>;
}
