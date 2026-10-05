import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
export const metadata = { title: "Rechercher un produit" };
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="wrap page-loading">Chargement du catalogue…</div>
      }
    >
      <CatalogView />
    </Suspense>
  );
}
