import { StoreText } from "@/components/storefront-language";
export default function Loading() {
  return <section className="auth-page wrap" role="status" aria-busy="true"><div className="auth-card"><p><StoreText>Chargement de votre espace de connexion…</StoreText></p><div className="route-loading-block" aria-hidden="true" /></div></section>;
}
