import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
export const metadata = { title: "Mes favoris" };
export default function Page() {
  return (
    <Suspense>
      <CatalogView favoritesOnly />
    </Suspense>
  );
}
