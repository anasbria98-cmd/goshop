import Link from "next/link";
import { AdminHeader, EmptyState, PanelHeader, Status } from "../_components";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { money } from "@/lib/catalog-model";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; payment?: string }> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("orders").select("id,order_number,email,phone,status,payment_status,fulfillment_status,grand_total,created_at").order("created_at", { ascending: false }).limit(100);
  if (params.q) query = query.or(`order_number.ilike.%${params.q.replace(/[,%()]/g, " ")}%,email.ilike.%${params.q.replace(/[,%()]/g, " ")}%,phone.ilike.%${params.q.replace(/[,%()]/g, " ")}%`);
  if (params.status) query = query.eq("status", params.status as never);
  if (params.payment) query = query.eq("payment_status", params.payment as never);
  const { data } = await query;
  return (
    <>
      <AdminHeader title="Commandes" description="Suivez les commandes, paiements et expéditions." />
      <form className="admin-filters"><label className="admin-search-field"><span>Rechercher</span><input name="q" defaultValue={params.q} placeholder="N° commande, email, téléphone" /></label><label><span>Commande</span><select name="status" defaultValue={params.status}><option value="">Tous les statuts</option>{["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"].map((status) => <option key={status}>{status}</option>)}</select></label><label><span>Paiement</span><select name="payment" defaultValue={params.payment}><option value="">Tous les paiements</option>{["pending", "authorized", "paid", "failed", "cancelled", "refunded", "partially_refunded"].map((status) => <option key={status}>{status}</option>)}</select></label><button>Appliquer</button></form>
      <section className="admin-panel admin-panel--flush">
        <PanelHeader title="Liste des commandes" count={data?.length ?? 0} />
        {data?.length ? <div className="admin-table-wrap"><table><thead><tr><th>Commande</th><th>Client</th><th>Statut</th><th>Paiement</th><th>Traitement</th><th>Total</th><th>Date</th></tr></thead><tbody>{data.map((order) => <tr key={order.id}><td data-label="Commande"><Link className="admin-table-link" href={`/admin/orders/${order.id}`}>{order.order_number}</Link></td><td data-label="Client">{order.email}<small>{order.phone}</small></td><td data-label="Statut"><Status>{order.status}</Status></td><td data-label="Paiement"><Status>{order.payment_status}</Status></td><td data-label="Traitement"><Status>{order.fulfillment_status}</Status></td><td data-label="Total"><strong>{money(Number(order.grand_total))}</strong></td><td data-label="Date">{new Date(order.created_at).toLocaleString("fr-MA")}</td></tr>)}</tbody></table></div> : <EmptyState title="Aucune commande">Aucune commande ne correspond à ces critères.</EmptyState>}
      </section>
    </>
  );
}
