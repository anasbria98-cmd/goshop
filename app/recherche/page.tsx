import { StoreText } from "@/components/storefront-language";
import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
import { getCategories, getProducts } from "@/lib/catalog";
export const metadata = { title: "Rechercher un produit" };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; promo?: string; nouveau?: string; marque?: string }> }) {
  const params = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ search: params.q, brand: params.marque, onSale: "promo" in params, isNew: "nouveau" in params }),
  ]);
  return (
    <Suspense
      fallback={
        <div className="wrap page-loading"><StoreText>Chargement du catalogue…</StoreText></div>
      }
    >
      <CatalogView categories={categories} products={products} query={params.q || ""} />
    </Suspense>
  );
}
