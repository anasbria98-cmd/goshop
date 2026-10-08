import { notFound } from "next/navigation";
import { products } from "@/data/catalog";
import { ProductDetail } from "@/components/product-detail";
const emptyCataloguePath = "catalogue-vide";
export function generateStaticParams() {
  return products.length
    ? products.map((p) => ({ slug: p.slug }))
    : [{ slug: emptyCataloguePath }];
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!products.length && slug === emptyCataloguePath) return { title: "Produit indisponible" };
  return { title: products.find((p) => p.slug === slug)?.name || "Produit" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
