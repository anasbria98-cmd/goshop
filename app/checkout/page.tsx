import { CheckoutForm } from "./checkout-form";
export const metadata = { title: "Finaliser ma commande", robots: { index: false, follow: true } };
export default function CheckoutPage() { return <div className="wrap checkout-page"><CheckoutForm /></div>; }
