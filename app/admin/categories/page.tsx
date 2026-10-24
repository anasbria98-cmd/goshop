import { categoryDescendants } from "@/lib/category-navigation";
import Link from "next/link";
import { ChevronRight, FolderTree, Pencil, Trash2 } from "lucide-react";
import { AdminHeader, EmptyState, PanelHeader, Status, SubmitButton } from "../_components";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteCategory, saveCategory } from "../actions";
import type { CategoryRow } from "@/lib/database.types";

function orderedTree(rows: CategoryRow[]) {
  const out: Array<CategoryRow & { depth: number; path: string }> = [];
  const walk = (parent: string | null, depth: number, parents: string[], visited = new Set<string>()) => rows.filter((row) => row.parent_id === parent && !visited.has(row.id)).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)).forEach((row) => {
    const path = [...parents, row.name];
    out.push({ ...row, depth, path: path.join(" → ") });
    walk(row.id, depth + 1, path, new Set([...visited,row.id]));
  });
  walk(null, 0, []);
  return out;
}

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ edit?: string; error?:string; saved?:string }> }) {
  const { edit,error,saved } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: assignments }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("product_categories").select("category_id"),
  ]);
  const rows = data ?? [];
  const categories = orderedTree(rows);
  const current = categories.find((item) => item.id === edit);
  const excludedParents = current ? categoryDescendants(rows,current.id) : new Set<string>();
  const productCounts = new Map<string, number>();
  assignments?.forEach((item) => productCounts.set(item.category_id, (productCounts.get(item.category_id) ?? 0) + 1));

  return (
    <>
      <AdminHeader title="Catégories" description="Organisez la hiérarchie du catalogue et sa visibilité dans le menu." />
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">Catégorie enregistrée.</p>}
      <div className="admin-split admin-split--catalog">
        <section className="admin-panel admin-panel--flush">
          <PanelHeader title="Arborescence" description="Départements, catégories et sous-catégories" count={categories.length} />
          {categories.length ? <div className="admin-tree">
            {categories.map((category) => (
              <div key={category.id} className={`admin-tree-row depth-${Math.min(category.depth, 3)}`}>
                <span className="admin-tree-branch" style={{ paddingLeft: category.depth * 20 }}>
                  {category.depth ? <ChevronRight aria-hidden="true" size={14} /> : <FolderTree aria-hidden="true" size={17} />}
                  <span><strong>{category.name}</strong><small>{category.path} · {productCounts.get(category.id) ?? 0} produit(s)</small></span>
                </span>
                <span className="admin-tree-meta"><Status>{category.is_active ? "Active" : "Inactive"}</Status><span className="admin-row-actions"><Link href={`?edit=${category.id}`}><Pencil size={14} /> Modifier</Link><form action={deleteCategory}><input type="hidden" name="id" value={category.id} /><button className="admin-danger-link"><Trash2 size={14} /> Supprimer</button></form></span></span>
              </div>
            ))}
          </div> : <EmptyState title="Aucune catégorie">Créez la première catégorie du catalogue.</EmptyState>}
        </section>
        <section className="admin-panel admin-editor-panel">
          <PanelHeader title={current ? "Modifier la catégorie" : "Nouvelle catégorie"} description={current ? current.path : "Ajoutez un niveau à l’arborescence"} />
          <form key={current?.id ?? "new"} action={saveCategory} className="admin-form">
            {current ? <input type="hidden" name="id" value={current.id} /> : null}
            <label>Nom <span className="required-mark">*</span><input name="name" defaultValue={current?.name} required /></label>
            <label>Slug<input name="slug" defaultValue={current?.slug} placeholder="Généré depuis le nom" /></label>
            <label>Catégorie parente<select name="parent_id" defaultValue={current?.parent_id ?? ""}><option value="">Catégorie racine</option>{categories.filter((item) => !excludedParents.has(item.id)).map((item) => <option value={item.id} key={item.id}>{"— ".repeat(item.depth)}{item.name}</option>)}</select></label>
            <label>Description<textarea name="description" rows={4} defaultValue={current?.description ?? ""} /></label>
            <div className="admin-form-grid"><label>Image URL<input name="image_url" defaultValue={current?.image_url ?? ""} /></label><label>Icône<input name="icon" defaultValue={current?.icon ?? ""} /></label></div>
            <label>Ordre d’affichage<input name="sort_order" type="number" defaultValue={current?.sort_order ?? 0} /></label>
            <div className="admin-checks"><label><input name="is_active" type="checkbox" defaultChecked={current?.is_active ?? true} /> Visible / active</label><label><input name="show_in_navigation" type="checkbox" defaultChecked={current?.show_in_navigation ?? true} /> Afficher dans les menus</label></div>
            <div className="admin-checks">
              <label><input name="show_in_top_navigation" type="checkbox" defaultChecked={current?.show_in_top_navigation ?? false} /> Afficher dans le menu du haut</label>
              <label><input name="show_in_all_categories" type="checkbox" defaultChecked={current?.show_in_all_categories ?? true} /> Afficher dans « Toutes les catégories »</label>
              <label><input name="show_in_mobile_menu" type="checkbox" defaultChecked={current?.show_in_mobile_menu ?? true} /> Afficher dans le menu mobile</label>
            </div>
            <p>Les catégories masquées dans tous les menus masquent aussi leur branche. L’ordre s’applique entre catégories de même parent ; la colonne conserve la présentation du menu sur ordinateur.</p>
            <label>Libellé court du menu (facultatif)<input name="navigation_label" defaultValue={current?.navigation_label ?? ""} placeholder="Nom de la catégorie par défaut" /></label>
            <label>Colonne du sous-menu sur ordinateur<select name="navigation_column" defaultValue={current?.navigation_column ?? 1}><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
            <div className="admin-form-divider"><span>Référencement</span></div>
            <label>Titre SEO<input name="seo_title" defaultValue={current?.seo_title ?? ""} /></label>
            <label>Description SEO<textarea name="seo_description" rows={3} defaultValue={current?.seo_description ?? ""} /></label>
            <div className="admin-editor-actions">{current ? <Link className="admin-secondary" href="/admin/categories">Annuler</Link> : null}<SubmitButton /></div>
          </form>
        </section>
      </div>
    </>
  );
}
