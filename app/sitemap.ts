import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/catalog";
import { information } from "@/data/information";

const origin = "https://www.goelec.ma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const populatedCategoryIds = new Set(products.flatMap((product) => product.categoryIds));
  const indexableCategories = categories.filter((category) => {
    if (category.path !== "domotique" && !category.path.startsWith("domotique/")) return true;
    return categories.some((child) =>
      (child.path === category.path || child.path.startsWith(`${category.path}/`))
      && populatedCategoryIds.has(child.id),
    );
  });
  const now = new Date();

  return [
    { url: `${origin}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...indexableCategories.map((category) => ({
      url: `${origin}/categorie/${category.path.split("/").map(encodeURIComponent).join("/")}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: category.parentId ? 0.7 : 0.8,
    })),
    ...products.map((product) => ({
      url: `${origin}/produit/${encodeURIComponent(product.slug)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...Object.keys(information).map((slug) => ({
      url: `${origin}/informations/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: slug === "a-propos" ? 0.5 : 0.3,
    })),
  ];
}
