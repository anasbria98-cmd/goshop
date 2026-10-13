import { StoreText } from "@/components/storefront-language";
import Link from "next/link";
export default function NotFound() {
  return (
    <section className="wrap placeholder-page">
      <h1><StoreText>Cette page n’existe pas</StoreText></h1>
      <p><StoreText>Retrouvez votre produit dans notre catalogue.</StoreText></p>
      <Link href="/recherche" className="button orange"><StoreText>
        Explorer les produits
      </StoreText></Link>
    </section>
  );
}
