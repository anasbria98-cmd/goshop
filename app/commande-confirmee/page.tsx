import { StoreText } from "@/components/storefront-language";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ClearCart } from "./clear-cart";
export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ numero?: string }> }) { const { numero } = await searchParams; return <section className="wrap placeholder-page"><ClearCart /><CheckCircle2 size={50} /><h1><StoreText>Commande enregistrée</StoreText></h1><p><StoreText>Votre numéro de commande est </StoreText><strong><StoreText>{numero || "confirmé"}</StoreText></strong>.</p><p><StoreText>Notre équipe vous contactera pour confirmer la disponibilité et la livraison. Aucun paiement en ligne n’a été simulé.</StoreText></p><Link className="button orange" href="/"><StoreText>Retour à l’accueil</StoreText></Link></section>; }
