import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/catalog-view";
import { getCategories, getCategoryFilters, getProducts } from "@/lib/catalog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const category = (await getCategories()).find((item) => item.path === slug.join("/"));
  return {
    title: category?.name ?? "Catégorie",
    description: category?.description ?? undefined,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((item) => item.path === slug.join("/"));
  if (!category) notFound();
  const filterCategory = categories.find((item) => item.path === slug[0]) ?? category;
  const [products, filters] = await Promise.all([getProducts({ categoryPath: slug }, categories), getCategoryFilters(filterCategory.id)]);
  return <Suspense><CatalogView category={category} categories={categories} products={products} availableFilters={filters} /></Suspense>;
}
