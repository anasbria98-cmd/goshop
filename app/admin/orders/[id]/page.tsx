import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, EmptyState, PanelHeader, Status, SubmitButton } from "../../_components";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { money } from "@/lib/catalog-model";
import { updateOrderStatus } from "../../actions";
import type { Json } from "@/lib/database.types";

function AddressBlock({ value }: { value: Json }) {
  if (!value || Array.isArray(value) || typeof value !== "object") return <p>Adresse non renseignée.</p>;
  const address = value as Record<string, Json | undefined>;
  const lines = [
    [address.first_name, address.last_name].filter(Boolean).join(" "),
    address.company,
    address.address_line_1,
    address.address_line_2,
    [address.postal_code, address.city].filter(Boolean).join(" "),
    address.region,
    address.country,
    address.phone,
  ].filter(Boolean).map(String);
  return <address>{lines.map((line) => <span key={line}>{line}</span>)}</address>;
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: order }, { data: items }, { data: payments }, { data: shipments }, { data: audit }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).single(),
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase.from("payments").select("*").eq("order_id", id),
    supabase.from("shipments").select("*,shipping_methods(name)").eq("order_id", id),
    supabase.from("admin_audit_logs").select("id,action,new_data,created_at").eq("entity_type", "orders").eq("entity_id", id).order("created_at", { ascending: false }),
  ]);
  if (!order) notFound();
  return (
    <>
      <AdminHeader title={`Commande ${order.order_number}`} description={`Créée le ${new Date(order.created_at).toLocaleString("fr-MA")}`}><Link className="admin-secondary" href="/admin/orders">Retour aux commandes</Link></AdminHeader>
      <div className="admin-order-summary"><div><span>Statut</span><Status>{order.status}</Status></div><div><span>Paiement</span><Status>{order.payment_status}</Status></div><div><span>Traitement</span><Status>{order.fulfillment_status}</Status></div><div><span>Total</span><strong>{money(Number(order.grand_total))}</strong></div></div>
      <div className="admin-order-grid">
        <div>
          <section className="admin-panel admin-panel--flush">
            <PanelHeader title="Articles" count={items?.length ?? 0} />
            {items?.length ? <div className="admin-table-wrap"><table><thead><tr><th>Produit</th><th>SKU</th><th>Qté</th><th>Prix</th><th>Total</th></tr></thead><tbody>{items.map((item) => <tr key={String(item.id)}><td data-label="Produit"><strong>{String(item.product_name)}</strong><small>{String(item.variant_name ?? "")}</small></td><td data-label="SKU"><code>{String(item.sku)}</code></td><td data-label="Qté">{String(item.quantity)}</td><td data-label="Prix">{money(Number(item.unit_price))}</td><td data-label="Total"><strong>{money(Number(item.line_total))}</strong></td></tr>)}</tbody></table></div> : <EmptyState>Aucun article dans cette commande.</EmptyState>}
            <dl className="order-totals"><div><dt>Sous-total</dt><dd>{money(Number(order.subtotal))}</dd></div><div><dt>Remise</dt><dd>-{money(Number(order.discount_total))}</dd></div><div><dt>Livraison</dt><dd>{money(Number(order.shipping_total))}</dd></div><div><dt>Taxes</dt><dd>{money(Number(order.tax_total))}</dd></div><div><dt>Total</dt><dd>{money(Number(order.grand_total))}</dd></div></dl>
          </section>
          <section className="admin-panel"><PanelHeader title="Adresses" /><div className="admin-address-grid"><div><h3>Livraison</h3><AddressBlock value={order.shipping_address_snapshot} /></div><div><h3>Facturation</h3><AddressBlock value={order.billing_address_snapshot} /></div></div></section>
          <section className="admin-panel"><PanelHeader title="Historique" description="Événements administratifs enregistrés" />{audit?.length ? <ol className="admin-timeline">{audit.map((entry) => <li key={String(entry.id)}><span /><div><strong>{String(entry.action)}</strong><small>{new Date(String(entry.created_at)).toLocaleString("fr-MA")}</small></div></li>)}</ol> : <EmptyState title="Aucun événement">Aucun changement de statut administratif enregistré.</EmptyState>}</section>
        </div>
        <aside>
          <section className="admin-panel"><PanelHeader title="Mettre à jour" description="Les transitions restent contrôlées côté serveur." /><form action={updateOrderStatus} className="admin-form"><input type="hidden" name="id" value={order.id} /><label>Nouveau statut<select name="status" defaultValue={order.status}>{["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"].map((status) => <option key={status}>{status}</option>)}</select></label><label>Note interne<textarea name="admin_note" rows={4} defaultValue={order.admin_note ?? ""} placeholder="Visible uniquement par l’équipe" /></label><SubmitButton>Mettre à jour</SubmitButton></form></section>
          <section className="admin-panel"><PanelHeader title="Client" /><dl className="admin-details"><div><dt>Email</dt><dd>{order.email}</dd></div><div><dt>Téléphone</dt><dd>{order.phone}</dd></div><div><dt>Note client</dt><dd>{order.customer_note || "—"}</dd></div></dl></section>
          <section className="admin-panel"><PanelHeader title="Paiement" />{payments?.length ? payments.map((payment) => <div className="admin-payment-row" key={String(payment.id)}><span><strong>{String(payment.provider)}</strong><small>{String(payment.payment_method ?? "")}</small></span><span><Status>{String(payment.status)}</Status><strong>{money(Number(payment.amount))}</strong></span></div>) : <EmptyState>Aucun paiement enregistré.</EmptyState>}</section>
          <section className="admin-panel"><PanelHeader title="Expédition" />{shipments?.length ? shipments.map((shipment) => <div className="admin-shipment-row" key={String(shipment.id)}><Status>{String(shipment.status)}</Status><p><strong>{String(shipment.carrier ?? "Transporteur à définir")}</strong><br /><small>{String(shipment.tracking_number ?? "Sans numéro de suivi")}</small></p></div>) : <EmptyState>Aucune expédition enregistrée.</EmptyState>}</section>
        </aside>
      </div>
    </>
  );
}
