import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/catalog";
import { AdminHeader } from "../_components";
import { SliderManager } from "./slider-manager";
import styles from "./sliders.module.css";

export default async function SlidersPage() {
  await requireRole(["admin", "super_admin"]);
  const db = await createSupabaseServerClient();
  const [{ data: slides, error }, categories] = await Promise.all([db.from("homepage_slides").select("*").order("sort_order").order("id"), getCategories()]);
  const products: { id: string; name: string; slug: string }[] = [];
  for (let start = 0; ; start += 1000) {
    const result = await db.from("products").select("id,name,slug").eq("status", "active").not("published_at", "is", null).order("id").range(start, start + 999);
    if (result.error) throw new Error("Impossible de charger les destinations produit.");
    products.push(...result.data);
    if (result.data.length < 1000) break;
  }
  return <>
    <AdminHeader title="Gestion des Sliders" description="Gérez les bannières de la page d’accueil, leurs liens et leur ordre d’affichage." />
    {error ? <section className="admin-panel"><p role="alert">La gestion des sliders n’est pas encore disponible dans cette base. Appliquez la migration des sliders à l’environnement concerné.</p></section> : <div className={styles.manager}><SliderManager initialSlides={slides ?? []} categories={categories.map((category) => ({ id: category.id, name: category.name, path: category.path }))} products={products} /></div>}
  </>;
}
