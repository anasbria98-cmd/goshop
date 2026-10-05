import Link from "next/link";
import { UserRound } from "lucide-react";
export const metadata = { title: "Mon compte" };
export default function Page() {
  return (
    <section className="wrap placeholder-page">
      <UserRound size={40} />
      <h1>Votre espace Goshop.ma</h1>
      <p>
        La création de compte et le suivi des commandes seront disponibles à
        l’ouverture de la boutique.
      </p>
      <p>
        En attendant, votre panier et vos favoris sont conservés sur cet
        appareil.
      </p>
      <div>
        <Link href="/favoris" className="button navy">
          Mes favoris
        </Link>
        <Link href="/panier" className="button orange">
          Mon panier
        </Link>
      </div>
    </section>
  );
}
