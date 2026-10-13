import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/catalog";
import { ProductDetail } from "@/components/product-detail";
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
  return <ProductDetail product={product} />;
}
