import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Pencil, Trash2 } from "lucide-react";
import { AdminHeader, EmptyState, PanelHeader, Status, SubmitButton } from "../_components";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteBrand, saveBrand } from "../actions";

export default async function BrandsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: products }] = await Promise.all([
    supabase.from("brands").select("*").order("sort_order").order("name"),
    supabase.from("products").select("brand_id"),
  ]);
  const rows = data ?? [];
  const current = rows.find((item) => item.id === edit);
  const productCounts = new Map<string, number>();
  products?.forEach((product) => product.brand_id && productCounts.set(product.brand_id, (productCounts.get(product.brand_id) ?? 0) + 1));

  return (
    <>
      <AdminHeader title="Marques" description="Gérez les fabricants affichés dans le catalogue." />
      <div className="admin-split">
        <section className="admin-panel admin-panel--flush">
          <PanelHeader title="Répertoire des marques" count={rows.length} />
          {rows.length ? <div className="admin-table-wrap"><table><thead><tr><th>Marque</th><th>Produits</th><th>Ordre</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{rows.map((brand) => <tr key={brand.id}><td data-label="Marque"><span className="admin-brand-cell">{brand.logo_url ? <Image src={brand.logo_url} width={42} height={42} alt="" /> : <span><BadgeCheck size={18} /></span>}<span><strong>{brand.name}</strong><small>/{brand.slug}</small></span></span></td><td data-label="Produits">{productCounts.get(brand.id) ?? 0}</td><td data-label="Ordre">{brand.sort_order}</td><td data-label="Statut"><Status>{brand.is_active ? "Active" : "Inactive"}</Status></td><td data-label="Actions"><div className="admin-row-actions"><Link href={`?edit=${brand.id}`}><Pencil size={14} /> Modifier</Link><form action={deleteBrand}><input type="hidden" name="id" value={brand.id} /><button className="admin-danger-link"><Trash2 size={14} /> Supprimer</button></form></div></td></tr>)}</tbody></table></div> : <EmptyState title="Aucune marque">Ajoutez le premier fabricant du catalogue.</EmptyState>}
        </section>
        <section className="admin-panel admin-editor-panel">
          <PanelHeader title={current ? "Modifier la marque" : "Nouvelle marque"} description="Identité, visibilité et SEO" />
          <form action={saveBrand} className="admin-form">
            {current ? <input type="hidden" name="id" value={current.id} /> : null}
            <label>Nom <span className="required-mark">*</span><input name="name" defaultValue={current?.name} required /></label>
            <label>Slug<input name="slug" defaultValue={current?.slug} placeholder="Généré depuis le nom" /></label>
            <label>Logo URL<input name="logo_url" defaultValue={current?.logo_url ?? ""} /></label>
            <label>Site web<input name="website_url" type="url" defaultValue={current?.website_url ?? ""} placeholder="https://" /></label>
            <label>Description<textarea name="description" rows={4} defaultValue={current?.description ?? ""} /></label>
            <div className="admin-form-grid"><label>Ordre<input name="sort_order" type="number" defaultValue={current?.sort_order ?? 0} /></label><label className="admin-checkbox"><input name="is_active" type="checkbox" defaultChecked={current?.is_active ?? true} /> Marque active</label></div>
            <div className="admin-form-divider"><span>Référencement</span></div>
            <label>Titre SEO<input name="seo_title" defaultValue={current?.seo_title ?? ""} /></label>
            <label>Description SEO<textarea name="seo_description" rows={3} defaultValue={current?.seo_description ?? ""} /></label>
            <div className="admin-editor-actions">{current ? <Link className="admin-secondary" href="/admin/brands">Annuler</Link> : null}<SubmitButton /></div>
          </form>
        </section>
      </div>
    </>
  );
}
