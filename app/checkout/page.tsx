import Link from "next/link";
import { ShieldCheck } from "lucide-react";
export const metadata = { title: "Préparer ma commande" };
export default function Page() {
  return (
    <section className="wrap placeholder-page">
      <ShieldCheck size={44} />
      <h1>Votre sélection est prête</h1>
      <p>
        Goshop.ma est actuellement en démonstration. La commande en ligne et le
        paiement ne sont pas encore activés.
      </p>
      <p>
        Aucun montant ne sera prélevé. Retrouvez et modifiez votre sélection
        dans votre panier.
      </p>
      <Link href="/panier" className="button orange">
        Revenir à mon panier
      </Link>
    </section>
  );
}
