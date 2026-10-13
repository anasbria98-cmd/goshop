import Link from "next/link";
import { ArrowDown, ArrowUp, Boxes } from "lucide-react";
import { AdminHeader, EmptyState, PanelHeader, Status, SubmitButton } from "../_components";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adjustInventory } from "../actions";

type Movement = { id: string; product_id: string; type: string; quantity_change: number; previous_quantity: number; new_quantity: number; reason: string | null; reference: string | null; created_at: string; products: { name: string; sku: string } | null };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const { filter, q } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: movements }] = await Promise.all([
    supabase.from("inventory").select("id,quantity,reserved_quantity,low_stock_threshold,updated_at,products(id,name,sku,allow_backorder),product_variants(name,sku)").order("updated_at", { ascending: false }),
    supabase.from("inventory_movements").select("id,product_id,type,quantity_change,previous_quantity,new_quantity,reason,reference,created_at,products(name,sku)").order("created_at", { ascending: false }).limit(30),
  ]);
  let rows = data ?? [];
  const search = q?.trim().toLowerCase();
  if (search) rows = rows.filter((item) => {
    const product = item.products as unknown as { name: string; sku: string } | null;
    const variant = item.product_variants as unknown as { name: string; sku: string } | null;
    return [product?.name, product?.sku, variant?.name, variant?.sku].some((value) => value?.toLowerCase().includes(search));
  });
  if (filter === "low") rows = rows.filter((item) => item.quantity - item.reserved_quantity > 0 && item.quantity - item.reserved_quantity <= item.low_stock_threshold);
  if (filter === "out") rows = rows.filter((item) => item.quantity - item.reserved_quantity <= 0);
  if (filter === "in") rows = rows.filter((item) => item.quantity - item.reserved_quantity > item.low_stock_threshold);

  return (
    <>
      <AdminHeader title="Stocks" description="Disponibilités, réservations et ajustements inventoriés." />
      <form className="admin-filters"><label className="admin-search-field"><span>Rechercher</span><input name="q" defaultValue={q} placeholder="Produit ou SKU" /></label><label><span>État du stock</span><select name="filter" defaultValue={filter}><option value="">Tous</option><option value="in">En stock</option><option value="low">Stock faible</option><option value="out">Rupture</option></select></label><button>Appliquer</button></form>
      <section className="admin-panel admin-panel--flush">
        <PanelHeader title="Inventaire" description="Stock physique, réservé et disponible" count={rows.length} />
        {rows.length ? <div className="admin-table-wrap"><table><thead><tr><th>Produit</th><th>Physique</th><th>Réservé</th><th>Disponible</th><th>Seuil</th><th>État</th><th>Ajustement manuel</th></tr></thead><tbody>{rows.map((item) => {
          const product = item.products as unknown as { id: string; name: string; sku: string } | null;
          const variant = item.product_variants as unknown as { name: string; sku: string } | null;
          const available = item.quantity - item.reserved_quantity;
          return <tr key={item.id}><td data-label="Produit">{product?.id ? <Link className="admin-table-link" href={`/admin/products/${product.id}`}>{product.name}</Link> : <strong>Produit</strong>}<small>{variant ? `${variant.name} · ${variant.sku}` : product?.sku}</small></td><td data-label="Physique">{item.quantity}</td><td data-label="Réservé">{item.reserved_quantity}</td><td data-label="Disponible"><strong>{available}</strong></td><td data-label="Seuil">{item.low_stock_threshold}</td><td data-label="État"><Status>{available <= 0 ? "Rupture" : available <= item.low_stock_threshold ? "Faible" : "Disponible"}</Status></td><td data-label="Ajustement"><form action={adjustInventory} className="inline-adjust"><input type="hidden" name="inventory_id" value={item.id} /><input aria-label="Variation de quantité" name="quantity_delta" type="number" placeholder="+/−" required /><input aria-label="Motif de l’ajustement" name="reason" placeholder="Motif obligatoire" required /><SubmitButton>Appliquer</SubmitButton></form></td></tr>;
        })}</tbody></table></div> : <EmptyState title="Aucune ligne de stock">Aucun stock ne correspond aux critères.</EmptyState>}
      </section>
      <section className="admin-panel admin-panel--flush">
        <PanelHeader title="Mouvements récents" description="Historique traçable des ajustements" count={movements?.length ?? 0} />
        {movements?.length ? <div className="admin-table-wrap"><table><thead><tr><th>Produit</th><th>Mouvement</th><th>Variation</th><th>Avant / après</th><th>Motif</th><th>Date</th></tr></thead><tbody>{(movements as unknown as Movement[]).map((movement) => <tr key={movement.id}><td data-label="Produit"><strong>{movement.products?.name ?? "Produit"}</strong><small>{movement.products?.sku}</small></td><td data-label="Mouvement"><Status>{movement.type}</Status></td><td data-label="Variation"><span className={movement.quantity_change > 0 ? "admin-stock-in" : "admin-stock-out"}>{movement.quantity_change > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{movement.quantity_change > 0 ? "+" : ""}{movement.quantity_change}</span></td><td data-label="Avant / après">{movement.previous_quantity} → {movement.new_quantity}</td><td data-label="Motif">{movement.reason || "—"}<small>{movement.reference}</small></td><td data-label="Date">{new Date(movement.created_at).toLocaleString("fr-MA")}</td></tr>)}</tbody></table></div> : <EmptyState title="Aucun mouvement"><Boxes size={18} /> L’historique apparaîtra après le premier ajustement.</EmptyState>}
      </section>
    </>
  );
}
