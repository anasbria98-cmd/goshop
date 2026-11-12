import { StoreText } from "@/components/storefront-language";
import Link from "next/link";
import { notFound } from "next/navigation";
import { information } from "@/data/information";
export function generateStaticParams() {
  return Object.keys(information).map((slug) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const info = information[slug];
  const descriptions: Record<string, string> = {
    "a-propos": "Découvrez GO ELEC, spécialiste du matériel électrique pour les professionnels et les particuliers au Maroc.",
    contact: "Contactez GO ELEC pour vos questions, vos commandes et vos projets de matériel électrique au Maroc.",
    "service-client": "Le service client GO ELEC vous accompagne dans le choix de vos équipements et le suivi de vos commandes.",
    magasins: "Consultez les informations GO ELEC concernant les points de retrait et les modalités de retrait de vos commandes.",
    livraison: "Informations sur la livraison des commandes GO ELEC au Maroc, selon la zone, le poids et le volume.",
    paiement: "Consultez les informations relatives aux moyens de paiement et à la validation des commandes chez GO ELEC.",
    retours: "Informations GO ELEC sur les demandes de retour, les garanties et le service après-vente de vos commandes.",
    faq: "Retrouvez les réponses aux questions fréquentes sur les commandes, le panier et le suivi chez GO ELEC.",
    cgv: "Consultez les conditions générales de vente applicables aux commandes passées auprès de GO ELEC.",
    confidentialite: "Consultez la politique de confidentialité GO ELEC et les informations relatives au traitement des données.",
    "mentions-legales": "Consultez les mentions légales et les informations relatives à l’exploitation du site GO ELEC.",
  };
  return {
    title: info?.title || "Informations",
    description: descriptions[slug],
    alternates: { canonical: `https://www.goelec.ma/informations/${encodeURIComponent(slug)}` },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const info = information[slug];
  if (!info) notFound();
  return (
    <section className="wrap information-page">
      <div className="breadcrumbs">
        <Link href="/"><StoreText>Accueil</StoreText></Link>
        <span>/</span>
        <StoreText>{info.title}</StoreText>
      </div>
      <h1><StoreText>{info.title}</StoreText></h1>
      {info.body.map((p) => (
        <p key={p}><StoreText>{p}</StoreText></p>
      ))}
      <Link href="/" className="text-link"><StoreText>
        Retour à la boutique
      </StoreText></Link>
    </section>
  );
}
