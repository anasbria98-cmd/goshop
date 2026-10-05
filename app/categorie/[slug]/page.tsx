import { Suspense } from "react";
import { notFound } from "next/navigation";
import { categories } from "@/data/catalog";
import { CatalogView } from "@/components/catalog-view";
export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: categories.find((c) => c.slug === slug)?.name || "Catégorie",
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!categories.some((c) => c.slug === slug)) notFound();
  return (
    <Suspense>
      <CatalogView category={slug} />
    </Suspense>
  );
}
