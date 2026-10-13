import { StoreText } from "@/components/storefront-language";
export default function Loading() {
  return <section className="wrap account-page" role="status" aria-busy="true"><h1><StoreText>Mon compte</StoreText></h1><p><StoreText>Ouverture de votre espace…</StoreText></p><div className="account-grid" aria-hidden="true"><div className="route-loading-block" /><div className="route-loading-block" /></div></section>;
}
