import "server-only";
import { hasSupabaseEnv } from "./env";
import { createSupabaseServerClient } from "./supabase/server";
import type { CatalogCategory } from "./catalog-model";
import { legacySlides, safeSlideLink, type HeroSlide, type SlideLocation } from "./home-slides";

export async function getHomeSlides(categories: CatalogCategory[]): Promise<Record<SlideLocation, HeroSlide[]>> {
  const fallback = () => {
    const result: Record<SlideLocation, HeroSlide[]> = { primary: [], secondary: [] };
    for (const slide of legacySlides) {
      const category = categories.find((item) => item.slug === slide.slug);
      result[slide.location].push({ name: slide.name, alt: slide.alt, src: `/promotions/${slide.slug}.png`, href: category ? `/categorie/${category.path}` : `/recherche?q=${encodeURIComponent(slide.name)}` });
    }
    return result;
  };
  if (!hasSupabaseEnv()) return fallback();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("homepage_slides").select("*").eq("is_active", true).order("sort_order").order("id");
  // Preserve the approved storefront until the migration has been applied.
  if (error) { console.error("Homepage sliders unavailable:", error.code); return fallback(); }
  const result: Record<SlideLocation, HeroSlide[]> = { primary: [], secondary: [] };
  const ids = (data ?? []).filter((row) => row.link_type === "product" && row.product_id).map((row) => row.product_id!);
  const { data: products } = ids.length ? await supabase.from("products").select("id,slug").in("id", ids).eq("status", "active").not("published_at", "is", null) : { data: [] };
  for (const slide of data ?? []) {
    let href: string | null = null;
    if (slide.link_type === "category") { const category = categories.find((item) => item.id === slide.category_id); if (category) href = `/categorie/${category.path}`; }
    if (slide.link_type === "product") { const product = products?.find((item) => item.id === slide.product_id); if (product) href = `/produit/${product.slug}`; }
    if (slide.link_type === "custom" && slide.custom_url && safeSlideLink(slide.custom_url)) href = slide.custom_url;
    result[slide.location].push({ id: slide.id, name: slide.name, alt: slide.alt, src: slide.image_url, href });
  }
  return result;
}
