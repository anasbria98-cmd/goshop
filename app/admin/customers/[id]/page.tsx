import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, EmptyState, PanelHeader, Status } from "../../_components";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/catalog-model";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole();
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const [{ data: profile }, { data: addresses }, { data: orders }, authResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("addresses").select("*").eq("user_id", id),
    supabase.from("orders").select("id,order_number,status,payment_status,grand_total,created_at").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.auth.admin.getUserById(id),
  ]);
  if (!profile) notFound();
  const email = authResult.data.user?.email;
  const validOrders = (orders ?? []).filter((order) => !["cancelled", "refunded"].includes(order.status));
  const total = validOrders.reduce((sum, order) => sum + Number(order.grand_total), 0);
  return (
    <>
      <AdminHeader title={[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Client"} description={email || "Profil client"}><Link className="admin-secondary" href="/admin/customers">Retour aux clients</Link></AdminHeader>
      <div className="admin-customer-stats"><article><span>Commandes</span><strong>{orders?.length ?? 0}</strong></article><article><span>Total dépensé</span><strong>{money(total)}</strong></article><article><span>Client depuis</span><strong>{new Date(profile.created_at).toLocaleDateString("fr-MA")}</strong></article></div>
      <div className="admin-split">
        <div>
          <section className="admin-panel"><PanelHeader title="Profil" /><dl className="admin-details"><div><dt>Nom</dt><dd>{[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "—"}</dd></div><div><dt>Email</dt><dd>{email || "—"}</dd></div><div><dt>Téléphone</dt><dd>{profile.phone || "—"}</dd></div></dl></section>
          <section className="admin-panel"><PanelHeader title="Adresses" count={addresses?.length ?? 0} />{addresses?.length ? <div className="admin-address-list">{addresses.map((address) => <address key={String(address.id)}><strong>{String(address.label || "Adresse")}</strong><span>{String(address.first_name)} {String(address.last_name)}</span><span>{String(address.address_line_1)}</span>{address.address_line_2 ? <span>{String(address.address_line_2)}</span> : null}<span>{String(address.postal_code || "")} {String(address.city)}</span><span>{String(address.region || "")}</span><span>{String(address.phone)}</span></address>)}</div> : <EmptyState>Aucune adresse enregistrée.</EmptyState>}</section>
        </div>
        <section className="admin-panel admin-panel--flush"><PanelHeader title="Historique des commandes" count={orders?.length ?? 0} />{orders?.length ? <div className="admin-customer-orders">{orders.map((order) => <Link href={`/admin/orders/${order.id}`} key={order.id}><span><strong>{order.order_number}</strong><small>{new Date(order.created_at).toLocaleDateString("fr-MA")}</small></span><Status>{order.status}</Status><strong>{money(Number(order.grand_total))}</strong></Link>)}</div> : <EmptyState>Aucune commande.</EmptyState>}</section>
      </div>
    </>
  );
}
