import { StoreText } from "@/components/storefront-language";
import { signOut } from "@/app/auth/actions";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/auth-routing";
export const dynamic = "force-dynamic";
export const metadata = { title: "Mon compte" };
export default async function Page() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (isAdminRole(profile?.role)) redirect("/admin");
  const [{ data: orders }, { data: addresses }] = await Promise.all([
    supabase.from("orders").select("id,order_number,status,grand_total,currency,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("addresses").select("*").eq("user_id", user.id).order("created_at"),
  ]);
  return (
    <section className="wrap account-page">
      <div className="account-heading">
        <div><span className="eyebrow"><StoreText>MON ESPACE</StoreText></span><h1><StoreText>Bonjour </StoreText>{profile?.first_name ?? ""}</h1><p>{user.email}</p></div>
        <form action={signOut}><button className="button navy"><StoreText>Se déconnecter</StoreText></button></form>
      </div>
      <div className="account-grid">
        <article className="account-panel"><h2><StoreText>Mes commandes</StoreText></h2>{orders?.length ? orders.map((order) => <div className="account-row" key={String(order.id)}><strong>{String(order.order_number)}</strong><span><StoreText>{String(order.status)}</StoreText></span><span>{Number(order.grand_total).toFixed(2)} {String(order.currency)}</span></div>) : <p><StoreText>Aucune commande pour le moment.</StoreText></p>}</article>
        <article className="account-panel"><h2><StoreText>Mes adresses</StoreText></h2>{addresses?.length ? addresses.map((address) => <div className="account-row" key={String(address.id)}><strong>{String(address.label ?? "Adresse")}</strong><span>{String(address.address_line_1)}</span><span>{String(address.city)}</span></div>) : <p><StoreText>Aucune adresse enregistrée.</StoreText></p>}</article>
      </div>
    </section>
  );
}
