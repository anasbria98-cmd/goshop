import Link from "next/link";
import { AdminHeader, EmptyState, PanelHeader, Status, SubmitButton } from "../_components";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { savePromotion } from "../actions";
import { money } from "@/lib/catalog-model";

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
  const rows = data ?? [];
  const current = rows.find((item) => item.id === edit);
  return (
    <>
      <AdminHeader title="Promotions" description="Configurez les codes, périodes, limites et remises." />
      <div className="admin-split admin-split--promotions">
        <section className="admin-panel admin-panel--flush"><PanelHeader title="Promotions" count={rows.length} />{rows.length ? <div className="admin-table-wrap"><table><thead><tr><th>Promotion</th><th>Remise</th><th>Période</th><th>Utilisation</th><th>Statut</th><th>Action</th></tr></thead><tbody>{rows.map((promotion) => <tr key={promotion.id}><td data-label="Promotion"><strong>{promotion.name}</strong><small>{promotion.code || "Sans code"}</small></td><td data-label="Remise"><strong>{promotion.type === "percentage" ? `${Number(promotion.value)} %` : money(Number(promotion.value))}</strong></td><td data-label="Période"><span>{promotion.starts_at ? new Date(promotion.starts_at).toLocaleDateString("fr-MA") : "Immédiate"}</span><small>au {promotion.ends_at ? new Date(promotion.ends_at).toLocaleDateString("fr-MA") : "sans fin"}</small></td><td data-label="Utilisation">{promotion.usage_count}{promotion.usage_limit ? ` / ${promotion.usage_limit}` : ""}</td><td data-label="Statut"><Status>{promotion.is_active ? "Active" : "Inactive"}</Status></td><td data-label="Action"><Link className="admin-table-link" href={`?edit=${promotion.id}`}>Modifier</Link></td></tr>)}</tbody></table></div> : <EmptyState title="Aucune promotion" actionHref="#promotion-form" actionLabel="Créer une promotion">Créez votre première promotion pour proposer une remise à vos clients.</EmptyState>}</section>
        <section className="admin-panel admin-editor-panel" id="promotion-form"><PanelHeader title={current ? "Modifier la promotion" : "Nouvelle promotion"} description="Règles de remise et période de validité" /><form action={savePromotion} className="admin-form">{current ? <input type="hidden" name="id" value={current.id} /> : null}<label>Nom <span className="required-mark">*</span><input name="name" defaultValue={current?.name} required /></label><label>Code<input name="code" defaultValue={current?.code ?? ""} /></label><div className="admin-form-grid"><label>Type<select name="type" defaultValue={current?.type ?? "percentage"}><option value="percentage">Pourcentage</option><option value="fixed">Montant fixe</option></select></label><label>Valeur <span className="required-mark">*</span><input name="value" type="number" min="0.01" step="0.01" defaultValue={current?.value ?? ""} required /></label></div><div className="admin-form-grid"><label>Commande minimum (DH)<input name="minimum_order_amount" type="number" min="0" step="0.01" defaultValue={current?.minimum_order_amount ?? 0} /></label><label>Remise maximum (DH)<input name="maximum_discount" type="number" min="0" step="0.01" defaultValue={current?.maximum_discount ?? ""} /></label></div><div className="admin-form-grid"><label>Début<input name="starts_at" type="datetime-local" defaultValue={current?.starts_at?.slice(0, 16) ?? ""} /></label><label>Fin<input name="ends_at" type="datetime-local" defaultValue={current?.ends_at?.slice(0, 16) ?? ""} /></label></div><label>Limite d’utilisation<input name="usage_limit" type="number" min="1" defaultValue={current?.usage_limit ?? ""} /></label><label className="admin-checkbox"><input name="is_active" type="checkbox" defaultChecked={current?.is_active ?? true} /> Promotion active</label><div className="admin-editor-actions">{current ? <Link className="admin-secondary" href="/admin/promotions">Annuler</Link> : null}<SubmitButton /></div></form></section>
      </div>
    </>
  );
}
