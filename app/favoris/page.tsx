import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
import { getCategories, getProducts } from "@/lib/catalog";
export const metadata = { title: "Mes favoris" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  return (
    <Suspense>
      <CatalogView categories={categories} products={products} favoritesOnly />
    </Suspense>
  );
}
