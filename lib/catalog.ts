import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { homepageDepartments } from "@/lib/homepage-model";
import type { CatalogCategory, CatalogFilter, CatalogProduct } from "@/lib/catalog-model";
import { isAppareillage, productDisplayImage } from "@/lib/product-variants";

type RawCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
};

type RawProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  manufacturer_reference: string | null;
  main_image_url: string | null;
  color_variants_enabled?: boolean;
  price: number | string;
  compare_at_price: number | string | null;
  allow_backorder: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  is_on_sale: boolean;
  featured: boolean;
  short_description: string | null;
  description: string | null;
  brands: { name: string; slug: string } | null;
  product_categories: Array<{
    is_primary: boolean;
    categories: RawCategory | null;
  }>;
  product_images: Array<{
    storage_path: string;
    alt_text: string | null;
    sort_order: number;
  }>;
  inventory: Array<{ variant_id: string | null; quantity: number; reserved_quantity: number }>;
  product_variants: Array<{ id: string; name: string; sku: string; barcode: string | null; price: number | null; compare_at_price: number | null; is_active: boolean; color_name?: string | null; color_hex?: string | null; finish?: string | null; image_path?: string | null }>;
  reviews: Array<{ rating: number }>;
  product_attribute_values: Array<{
    text_value: string | null;
    number_value: number | string | null;
    boolean_value: boolean | null;
    attributes: { name: string; slug: string; unit: string | null } | null;
    attribute_options: { label: string } | null;
  }>;
};

function buildCategoryPaths(rows: RawCategory[]) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const pathFor = (row: RawCategory) => {
    const parts = [row.slug];
    let parent = row.parent_id ? byId.get(row.parent_id) : undefined;
    const visited = new Set<string>([row.id]);
    while (parent && !visited.has(parent.id)) {
      visited.add(parent.id);
      parts.unshift(parent.slug);
      parent = parent.parent_id ? byId.get(parent.parent_id) : undefined;
    }
    return parts.join("/");
  };
  return new Map(rows.map((row) => [row.id, pathFor(row)]));
}

export async function getCategories(): Promise<CatalogCategory[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,description,parent_id,image_url,sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Impossible de charger les catégories: ${error.message}`);
  const rows = (data ?? []) as RawCategory[];
  const paths = buildCategoryPaths(rows);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: row.parent_id,
    imageUrl: row.image_url,
    path: paths.get(row.id) ?? row.slug,
  }));
}

function storageUrl(path: string, baseUrl: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${baseUrl}/storage/v1/object/public/product-images/${path}`;
}

function mapProduct(row: RawProduct, categories: CatalogCategory[], baseUrl: string): CatalogProduct {
  const primary = row.product_categories.find((item) => item.is_primary)?.categories
    ?? row.product_categories[0]?.categories
    ?? null;
  const category = primary ? categories.find((item) => item.id === primary.id) ?? null : null;
  const images = [...row.product_images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => ({
      url: storageUrl(image.storage_path, baseUrl),
      alt: image.alt_text || row.name,
    }));
  if (row.main_image_url) {
    const mainUrl = storageUrl(row.main_image_url, baseUrl);
    const existingIndex = images.findIndex((image) => image.url === mainUrl);
    if (existingIndex >= 0) images.unshift(...images.splice(existingIndex, 1));
    else images.unshift({ url: mainUrl, alt: row.name });
  }
  const stock = row.inventory.reduce(
    (sum, item) => sum + Math.max(0, item.quantity - item.reserved_quantity),
    0,
  );
  const ratingTotal = row.reviews.reduce((sum, review) => sum + Number(review.rating), 0);
  const categoryIds = row.product_categories.flatMap((item) => item.categories?.id ? [item.categories.id] : []);
  const colors = isAppareillage(categoryIds, categories) ? (row.product_variants ?? []).filter((variant) => variant.color_name && variant.color_hex && variant.image_path) : [];
  const hasColorVariants = isAppareillage(categoryIds, categories) && (row.color_variants_enabled || colors.length > 0);
  const variants = colors.filter((variant) => variant.is_active).map((variant) => {
    const inventory = row.inventory.find((item) => item.variant_id === variant.id);
    return { id: variant.id, name: variant.name, sku: variant.sku, barcode: variant.barcode,
      colorName: variant.color_name!, colorHex: variant.color_hex!, finish: variant.finish ?? null,
      price: Number(variant.price ?? row.price), compareAtPrice: variant.compare_at_price == null ? null : Number(variant.compare_at_price),
      imageUrl: storageUrl(variant.image_path!, baseUrl),
      stock: Math.max(0, (inventory?.quantity ?? 0) - (inventory?.reserved_quantity ?? 0)) };
  });
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    brand: row.brands?.name ?? "",
    brandSlug: row.brands?.slug ?? null,
    category,
    categoryIds,
    imageUrl: productDisplayImage({ imageUrl: images[0]?.url ?? null, variants, allowBackorder: row.allow_backorder }),
    images,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price == null ? null : Number(row.compare_at_price),
    rating: row.reviews.length ? ratingTotal / row.reviews.length : 0,
    reviewCount: row.reviews.length,
    manufacturerReference: row.manufacturer_reference,
    stock: hasColorVariants ? variants.reduce((sum, variant) => sum + variant.stock, 0) : stock,
    ...(hasColorVariants ? { hasColorVariants: true, variants } : {}),
    allowBackorder: row.allow_backorder,
    isNew: row.is_new,
    isBestSeller: row.is_best_seller,
    isOnSale: row.is_on_sale,
    featured: row.featured,
    shortDescription: row.short_description,
    description: row.description,
    attributes: row.product_attribute_values.flatMap((value) => {
      if (!value.attributes) return [];
      const displayed = value.attribute_options?.label
        ?? value.text_value
        ?? (value.number_value == null ? null : String(value.number_value))
        ?? (value.boolean_value == null ? null : value.boolean_value ? "Oui" : "Non");
      return displayed == null ? [] : [{
        name: value.attributes.name,
        slug: value.attributes.slug,
        unit: value.attributes.unit,
        value: displayed,
      }];
    }),
  };
}

export type ProductQuery = {
  slug?: string;
  search?: string;
  categoryPath?: string[];
  featured?: boolean;
  bestSeller?: boolean;
  isNew?: boolean;
  onSale?: boolean;
  brand?: string;
  limit?: number;
  ids?: string[];
  categoryIds?: string[];
  excludeId?: string;
};

export async function getProducts(query: ProductQuery = {}, knownCategories?: CatalogCategory[]): Promise<CatalogProduct[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createSupabaseServerClient();
  const categories = knownCategories ?? await getCategories();
  let relatedProductIds: string[] = [];
  let matchingBrandIds: string[] = [];
  if (query.search?.trim()) {
    const term = query.search.trim();
    const normalized = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const categoryIds = categories.filter((category) => category.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalized)).map((category) => category.id);
    const [{ data: brands }, { data: assignments }] = await Promise.all([
      supabase.from("brands").select("id").ilike("name", `%${term.replace(/[,%()]/g, " ")}%`),
      categoryIds.length ? supabase.from("product_categories").select("product_id").in("category_id", categoryIds) : Promise.resolve({ data: [] as { product_id: string }[] }),
    ]);
    matchingBrandIds = (brands ?? []).map((brand) => brand.id);
    relatedProductIds = (assignments ?? []).map((assignment) => assignment.product_id);
  }
  if (query.ids && !query.ids.length) return [];
  let categoryProductIds: string[] | undefined;
  if (query.categoryIds?.length) {
    const { data, error } = await supabase.from("product_categories").select("product_id").in("category_id", query.categoryIds);
    if (error) throw new Error("Impossible de charger les produits similaires.");
    categoryProductIds = [...new Set((data ?? []).map((item) => item.product_id))];
    if (!categoryProductIds.length) return [];
  }
  let builder = supabase
    .from("products")
    .select(`
      *,
      brands(name,slug),
      product_categories(is_primary,categories(id,name,slug,description,parent_id,image_url,sort_order)),
      product_images(storage_path,alt_text,sort_order),
      inventory(variant_id,quantity,reserved_quantity),
      product_variants(*),
      reviews!left(rating),
      product_attribute_values(text_value,number_value,boolean_value,attributes(name,slug,unit),attribute_options(label))
    `)
    .eq("status", "active")
    .not("published_at", "is", null)
    .order("created_at", { ascending: false });
  if (query.ids) builder = builder.in("id", query.ids);
  if (categoryProductIds) builder = builder.in("id", categoryProductIds);
  if (query.excludeId) builder = builder.neq("id", query.excludeId);
  if (query.featured) builder = builder.eq("featured", true);
  if (query.slug) builder = builder.eq("slug", query.slug).limit(1);
  if (query.bestSeller) builder = builder.eq("is_best_seller", true);
  if (query.isNew) builder = builder.eq("is_new", true);
  if (query.onSale) builder = builder.eq("is_on_sale", true);
  if (query.search) {
    const safe = query.search.replace(/[,%()]/g, " ").trim();
    if (safe) {
      const clauses = [`name.ilike.%${safe}%`, `sku.ilike.%${safe}%`, `manufacturer_reference.ilike.%${safe}%`];
      if (matchingBrandIds.length) clauses.push(`brand_id.in.(${matchingBrandIds.join(",")})`);
      if (relatedProductIds.length) clauses.push(`id.in.(${relatedProductIds.join(",")})`);
      builder = builder.or(clauses.join(","));
    }
  }
  if (query.limit) builder = builder.limit(query.limit);
  const { data, error } = await builder;
  if (error) throw new Error(`Impossible de charger les produits: ${error.message}`);
  let products = ((data ?? []) as unknown as RawProduct[]).map((row) =>
    mapProduct(row, categories, process.env.NEXT_PUBLIC_SUPABASE_URL!),
  );
  if (query.brand) products = products.filter((product) => product.brandSlug === query.brand);
  if (query.categoryPath?.length) {
    const path = query.categoryPath.join("/");
    const selected = categories.find((category) => category.path === path);
    if (!selected) return [];
    const childIds = new Set(
      categories
        .filter((category) => category.path === path || category.path.startsWith(`${path}/`))
        .map((category) => category.id),
    );
    products = products.filter((product) => product.categoryIds.some((id) => childIds.has(id)));
  }
  return products;
}

export async function getProductBySlug(slug: string) {
  return (await getProducts({ slug }))[0] ?? null;
}

export async function getCategoryFilters(categoryId: string): Promise<CatalogFilter[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("category_attributes").select("sort_order,attributes(name,slug,unit,is_filterable)").eq("category_id", categoryId).order("sort_order");
  if (error) throw new Error(`Impossible de charger les filtres: ${error.message}`);
  return (data ?? []).flatMap((item) => {
    const attribute = item.attributes as unknown as { name: string; slug: string; unit: string | null; is_filterable: boolean } | null;
    return attribute?.is_filterable ? [{ name: attribute.name, slug: attribute.slug, unit: attribute.unit }] : [];
  });
}

export async function getHomepageData() {
  const categories = await getCategories();
  const products = await getProducts({}, categories);
  const featured = products.filter((product) => product.featured).slice(0, 12);
  const bestSellers = products.filter((product) => product.isBestSeller).slice(0, 12);
  const newProducts = products.filter((product) => product.isNew).slice(0, 12);
  const sale = products.filter((product) => product.isOnSale).slice(0, 12);
  const departments = homepageDepartments(categories, products);
  const brands = [...new Map(products.filter((product) => product.brand).map((product) => [product.brandSlug || product.brand, product.brand])).entries()];
  const heroProduct = products.filter((product) => product.brandSlug === "schneider-electric" && product.category?.path.startsWith("materiel-electrique/")).sort((a, b) => a.price - b.price)[0] ?? null;
  return { categories, featured, bestSellers, newProducts, sale, departments, brands, heroProduct };
}
