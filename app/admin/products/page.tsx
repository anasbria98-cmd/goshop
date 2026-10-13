import Image from "next/image";
import Link from "next/link";
import { CircleCheck, FilePenLine, Package, PackageX } from "lucide-react";
import { AdminHeader, EmptyState, PanelHeader, Status } from "../_components";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { money } from "@/lib/catalog-model";
import { duplicateProduct, setProductStatus } from "../actions";

type Params = { q?: string; status?: string; category?: string; brand?: string; stock?: string; sort?: string; page?: string };
type Inventory = { quantity: number; reserved_quantity: number };
type Assignment = { category_id: string; is_primary?: boolean; categories?: { name: string } | null };

const imageUrl = (path: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const size = 20;
  const supabase = await createSupabaseServerClient();
  const [{ data: productData }, { data: brands }, { data: categories }] = await Promise.all([
    supabase.from("products").select("id,name,sku,status,price,brand_id,main_image_url,updated_at,inventory(quantity,reserved_quantity),product_categories(category_id,is_primary,categories(name))").limit(1000),
    supabase.from("brands").select("id,name").eq("is_active", true).order("name"),
    supabase.from("categories").select("id,name").eq("is_active", true).order("name"),
  ]);
  const allRows = productData ?? [];
  const catalogSummary = [
    { label: "Tous les produits", value: allRows.length, Icon: Package },
    { label: "Publiés", value: allRows.filter((product) => product.status === "active").length, Icon: CircleCheck },
    { label: "Brouillons", value: allRows.filter((product) => product.status === "draft").length, Icon: FilePenLine },
    { label: "Ruptures", value: allRows.filter((product) => ((product.inventory as unknown as Inventory[] | null) ?? []).reduce((sum, item) => sum + item.quantity - item.reserved_quantity, 0) <= 0).length, Icon: PackageX },
  ];
  let rows = [...allRows];
  const search = params.q?.trim().toLowerCase();
  if (search) rows = rows.filter((product) => product.name.toLowerCase().includes(search) || product.sku.toLowerCase().includes(search));
  if (["draft", "active", "archived"].includes(params.status ?? "")) rows = rows.filter((product) => product.status === params.status);
  if (params.brand) rows = rows.filter((product) => product.brand_id === params.brand);
  if (params.category) rows = rows.filter((product) => ((product.product_categories as unknown as Assignment[] | null) ?? []).some((item) => item.category_id === params.category));
  if (params.stock) rows = rows.filter((product) => {
    const available = ((product.inventory as unknown as Inventory[] | null) ?? []).reduce((sum, item) => sum + item.quantity - item.reserved_quantity, 0);
    return params.stock === "out" ? available <= 0 : params.stock === "low" ? available > 0 && available <= 5 : available > 5;
  });
  rows.sort((a, b) => params.sort === "name" ? a.name.localeCompare(b.name) : params.sort === "price_asc" ? Number(a.price) - Number(b.price) : params.sort === "price_desc" ? Number(b.price) - Number(a.price) : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const count = rows.length;
  const paged = rows.slice((page - 1) * size, page * size);
  const withQuery = (nextPage: number) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value) as [string, string][]);
    query.set("page", String(nextPage));
    return `?${query.toString()}`;
  };

  return (
    <>
      <AdminHeader title="Produits" description="Retrouvez, modifiez et publiez les produits de la boutique." actionHref="/admin/products/new" actionLabel="+ Ajouter un produit" />
      <div className="admin-catalog-summary">{catalogSummary.map(({ label, value, Icon }) => <article key={label}><span><Icon size={17} /></span><div><strong>{value}</strong><small>{label}</small></div></article>)}</div>
      <section className="admin-panel admin-panel--flush admin-products-panel">
      <PanelHeader title="Catalogue" description="Recherchez un produit ou affinez votre sélection" count={count} />
      <form className="admin-filters admin-filters--wide">
        <label className="admin-search-field"><span>Rechercher</span><input name="q" defaultValue={params.q} placeholder="Nom ou SKU" /></label>
        <label><span>Statut</span><select name="status" defaultValue={params.status}><option value="">Tous</option><option value="draft">Brouillon</option><option value="active">Publié</option><option value="archived">Archivé</option></select></label>
        <label><span>Catégorie</span><select name="category" defaultValue={params.category}><option value="">Toutes</option>{categories?.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        <label><span>Marque</span><select name="brand" defaultValue={params.brand}><option value="">Toutes</option>{brands?.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}</select></label>
        <label><span>Stock</span><select name="stock" defaultValue={params.stock}><option value="">Tous</option><option value="in">En stock</option><option value="low">Stock faible</option><option value="out">Rupture</option></select></label>
        <label><span>Trier</span><select name="sort" defaultValue={params.sort}><option value="updated">Mis à jour</option><option value="name">Nom A–Z</option><option value="price_asc">Prix croissant</option><option value="price_desc">Prix décroissant</option></select></label>
        <button type="submit">Appliquer</button>
      </form>

        {paged.length ? (
          <div className="admin-table-wrap">
            <table>
              <thead><tr><th>Produit</th><th>SKU</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>{paged.map((product) => {
                const stocks = (product.inventory as unknown as Inventory[] | null) ?? [];
                const available = stocks.reduce((sum, item) => sum + item.quantity - item.reserved_quantity, 0);
                const assignments = (product.product_categories as unknown as Assignment[] | null) ?? [];
                const primaryCategory = assignments.find((item) => item.is_primary)?.categories?.name ?? assignments[0]?.categories?.name;
                const productImage = imageUrl(product.main_image_url);
                return (
                  <tr key={product.id}>
                    <td data-label="Produit"><Link href={`/admin/products/${product.id}`} className="admin-product-cell">{productImage ? <Image src={productImage} width={44} height={44} alt="" /> : <span className="admin-product-placeholder"><Package size={18} /></span>}<strong>{product.name}</strong></Link></td>
                    <td data-label="SKU"><code>{product.sku}</code></td>
                    <td data-label="Catégorie">{primaryCategory || "Non classé"}</td>
                    <td data-label="Prix"><strong>{money(Number(product.price))}</strong></td>
                    <td data-label="Stock"><Status>{available <= 0 ? "Rupture" : available <= 5 ? "Faible" : "Disponible"}</Status><small>{available} disponible(s)</small></td>
                    <td data-label="Statut"><Status>{product.status}</Status></td>
                    <td data-label="Actions"><details className="admin-action-menu"><summary>Actions</summary><div><Link href={`/admin/products/${product.id}`}>Modifier</Link><form action={duplicateProduct}><input type="hidden" name="id" value={product.id} /><button>Dupliquer</button></form><form action={setProductStatus}><input type="hidden" name="id" value={product.id} /><input type="hidden" name="status" value={product.status === "active" ? "draft" : "active"} /><button>{product.status === "active" ? "Dépublier" : "Publier"}</button></form><form action={setProductStatus}><input type="hidden" name="id" value={product.id} /><input type="hidden" name="status" value="archived" /><button>Archiver</button></form></div></details></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : <EmptyState title="Aucun produit" actionHref="/admin/products/new" actionLabel="Ajouter un produit">Aucun produit ne correspond à ces critères.</EmptyState>}
      </section>
      {count > size ? <nav className="admin-pagination" aria-label="Pagination">{page > 1 ? <Link href={withQuery(page - 1)}>Précédent</Link> : <span />}<span>Page {page} sur {Math.ceil(count / size)}</span>{page * size < count ? <Link href={withQuery(page + 1)}>Suivant</Link> : <span />}</nav> : null}
    </>
  );
}
