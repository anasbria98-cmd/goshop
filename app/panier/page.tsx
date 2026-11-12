import { CartView } from "@/components/cart-view";
export const metadata = { title: "Mon panier", robots: { index: false, follow: true } };
export default function Page() {
  return <CartView />;
}
