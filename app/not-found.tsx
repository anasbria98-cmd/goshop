import Link from "next/link";
export default function NotFound() {
  return (
    <section className="wrap placeholder-page">
      <h1>Cette page n’existe pas</h1>
      <p>Retrouvez votre produit dans notre catalogue.</p>
      <Link href="/recherche" className="button orange">
        Explorer les produits
      </Link>
    </section>
  );
}
