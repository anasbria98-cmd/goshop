"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { colorVariantListSchema } from "@/lib/variant-input";
import { isAppareillage } from "@/lib/product-variants";

const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const optional = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return text || null;
};
const checked = (data: FormData, key: string) => data.get(key) === "on";
const number = (data: FormData, key: string, fallback = 0) => Number(data.get(key) || fallback);

async function staffClient() {
  await requireRole();
  return createSupabaseServerClient();
}

export async function saveCategory(data: FormData) {
  const supabase = await staffClient();
  const id = optional(data.get("id"));
  const name = z.string().min(2).max(120).parse(data.get("name"));
  const payload = {
    name,
    slug: slugify(optional(data.get("slug")) || name),
    description: optional(data.get("description")),
    parent_id: optional(data.get("parent_id")),
    image_url: optional(data.get("image_url")),
    icon: optional(data.get("icon")),
    sort_order: number(data, "sort_order"),
    is_active: checked(data, "is_active"),
    show_in_navigation: checked(data, "show_in_navigation"),
    seo_title: optional(data.get("seo_title")),
    seo_description: optional(data.get("seo_description")),
  };
  const result = id ? await supabase.from("categories").update(payload).eq("id", id) : await supabase.from("categories").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/admin/categories"); revalidatePath("/", "layout");
}

export async function deleteCategory(data: FormData) {
  const supabase = await staffClient();
  const id = z.string().uuid().parse(data.get("id"));
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error("Cette catégorie contient encore des éléments et ne peut pas être supprimée.");
  revalidatePath("/admin/categories");
}

export async function saveBrand(data: FormData) {
  const supabase = await staffClient();
  const id = optional(data.get("id"));
  const name = z.string().min(2).max(120).parse(data.get("name"));
  const payload = { name, slug: slugify(optional(data.get("slug")) || name), logo_url: optional(data.get("logo_url")), description: optional(data.get("description")), website_url: optional(data.get("website_url")), is_active: checked(data, "is_active"), sort_order: number(data, "sort_order"), seo_title: optional(data.get("seo_title")), seo_description: optional(data.get("seo_description")) };
  const result = id ? await supabase.from("brands").update(payload).eq("id", id) : await supabase.from("brands").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/admin/brands"); revalidatePath("/", "layout");
}

export async function deleteBrand(data: FormData) {
  const supabase = await staffClient();
  const id = z.string().uuid().parse(data.get("id"));
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/brands");
}

export async function saveProduct(data: FormData) {
  const supabase = await staffClient();
  const colorVariants = colorVariantListSchema.parse(JSON.parse(String(data.get("color_variants") || "[]")));
  const categoryIds = data.getAll("category_id").map(String).filter(Boolean);
  const primary = optional(data.get("primary_category_id")) || categoryIds[0];
  const id = optional(data.get("id"));
  const name = z.string().min(2).max(220).parse(data.get("name"));
  const price = z.number().nonnegative().parse(number(data, "price"));
  const compare = optional(data.get("compare_at_price"));
  const payload = {
    name,
    slug: slugify(optional(data.get("slug")) || name),
    sku: z.string().min(1).max(80).parse(data.get("sku")),
    manufacturer_reference: optional(data.get("manufacturer_reference")),
    barcode: optional(data.get("barcode")),
    brand_id: optional(data.get("brand_id")),
    short_description: optional(data.get("short_description")),
    description: optional(data.get("description")),
    price,
    compare_at_price: compare ? Number(compare) : null,
    cost_price: optional(data.get("cost_price")) ? number(data, "cost_price") : null,
    tax_rate: number(data, "tax_rate", 20),
    main_image_url: optional(data.get("main_image_url")),
    status: z.enum(["draft", "active", "archived"]).parse(data.get("status")),
    published_at: data.get("status") === "active" ? new Date().toISOString() : null,
    stock_tracking: checked(data, "stock_tracking"), allow_backorder: checked(data, "allow_backorder"), featured: checked(data, "featured"), is_new: checked(data, "is_new"), is_best_seller: checked(data, "is_best_seller"), is_on_sale: checked(data, "is_on_sale"),
    seo_title: optional(data.get("seo_title")), seo_description: optional(data.get("seo_description")),
  };
  if (colorVariants.length) {
    const { data: categories, error: categoryError } = await supabase.from("categories").select("id,slug,parent_id");
    if (categoryError) throw new Error(categoryError.message);
    if (!isAppareillage(categoryIds, categories ?? [])) throw new Error("Les couleurs sont réservées aux produits Appareillage.");
    const { data: savedId, error } = await supabase.rpc("save_product_with_color_variants", {
      p_product_id: id, p_product: payload, p_category_ids: categoryIds, p_primary_category_id: primary,
      p_stock: number(data, "stock"), p_low_stock_threshold: number(data, "low_stock_threshold", 5), p_variants: colorVariants,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/products"); revalidatePath("/", "layout");
    redirect(`/admin/products/${savedId}?saved=1`);
  }
  let productId = id;
  if (id) {
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data: product, error } = await supabase.from("products").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    productId = product.id;
  }
  if (!productId) throw new Error("Produit introuvable");
  await supabase.from("product_categories").delete().eq("product_id", productId);
  if (categoryIds.length) {
    const { error } = await supabase.from("product_categories").insert(categoryIds.map((category_id) => ({ product_id: productId!, category_id, is_primary: category_id === primary })));
    if (error) throw new Error(error.message);
  }
  const { data: existing } = await supabase.from("inventory").select("id").eq("product_id", productId).is("variant_id", null).maybeSingle();
  if (!existing) {
    const { error } = await supabase.from("inventory").insert({ product_id: productId, quantity: number(data, "stock"), reserved_quantity: 0, low_stock_threshold: number(data, "low_stock_threshold", 5) });
    if (error) throw new Error(error.message);
  } else if (data.has("low_stock_threshold")) {
    const { error } = await supabase.from("inventory").update({ low_stock_threshold: number(data, "low_stock_threshold", 5) }).eq("id", existing.id);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/admin/products"); revalidatePath("/", "layout");
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function setProductStatus(data: FormData) {
  const supabase = await staffClient();
  const id = z.string().uuid().parse(data.get("id"));
  const status = z.enum(["draft", "active", "archived"]).parse(data.get("status"));
  const { error } = await supabase.from("products").update({ status, published_at: status === "active" ? new Date().toISOString() : null }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products"); revalidatePath("/", "layout");
}

export async function duplicateProduct(data: FormData) {
  const supabase = await staffClient();
  const id = z.string().uuid().parse(data.get("id"));
  const { data: source, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  const copy = { ...source };
  delete (copy as Partial<typeof source>).id;
  delete (copy as Partial<typeof source>).created_at;
  delete (copy as Partial<typeof source>).updated_at;
  const suffix = Date.now().toString().slice(-6);
  const { data: created, error: createError } = await supabase.from("products").insert({ ...copy, name: `${source.name} (copie)`, slug: `${source.slug}-copie-${suffix}`, sku: `${source.sku}-C${suffix}`, barcode: null, status: "draft", published_at: null }).select("id").single();
  if (createError) throw new Error(createError.message);
  revalidatePath("/admin/products"); redirect(`/admin/products/${created.id}`);
}

export async function adjustInventory(data: FormData) {
  const supabase = await staffClient();
  const inventoryId = z.string().uuid().parse(data.get("inventory_id"));
  const delta = z.number().int().refine((value) => value !== 0).parse(number(data, "quantity_delta"));
  const { error } = await supabase.rpc("adjust_inventory", { inventory_id: inventoryId, quantity_delta: delta, movement_type: "manual_adjustment", movement_reason: optional(data.get("reason")), movement_reference: optional(data.get("reference")) });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/inventory"); revalidatePath("/", "layout");
}

export async function updateOrderStatus(data: FormData) {
  const supabase = await staffClient();
  const id = z.string().uuid().parse(data.get("id"));
  const status = z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]).parse(data.get("status"));
  const { error } = await supabase.rpc("admin_update_order_status", { p_order_id: id, p_status: status, p_admin_note: optional(data.get("admin_note")) });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/orders");
}

export async function savePromotion(data: FormData) {
  const supabase = await staffClient();
  const id = optional(data.get("id"));
  const payload = { name: z.string().min(2).parse(data.get("name")), code: optional(data.get("code"))?.toUpperCase() ?? null, type: z.enum(["percentage", "fixed"]).parse(data.get("type")), value: number(data, "value"), minimum_order_amount: number(data, "minimum_order_amount"), maximum_discount: optional(data.get("maximum_discount")) ? number(data, "maximum_discount") : null, starts_at: optional(data.get("starts_at")), ends_at: optional(data.get("ends_at")), usage_limit: optional(data.get("usage_limit")) ? number(data, "usage_limit") : null, is_active: checked(data, "is_active") };
  const result = id ? await supabase.from("promotions").update(payload).eq("id", id) : await supabase.from("promotions").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/admin/promotions");
}

export async function moderateReview(data: FormData) {
  const supabase = await staffClient();
  const id = z.string().uuid().parse(data.get("id"));
  const status = z.enum(["approved", "rejected"]).parse(data.get("status"));
  const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reviews"); revalidatePath("/", "layout");
}

export async function saveSetting(data: FormData) {
  const profile = await requireRole(["admin", "super_admin"]);
  const supabase = await createSupabaseServerClient();
  const key = z.string().regex(/^[a-z0-9_]+$/).parse(data.get("key"));
  const value = String(data.get("value") ?? "");
  const { error } = await supabase.from("store_settings").upsert({ key, value, group_name: String(data.get("group_name") || "general"), is_public: checked(data, "is_public"), description: optional(data.get("description")), updated_by: profile.id });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings"); revalidatePath("/", "layout");
}

export async function updateAdministratorRole(data: FormData) {
  const actor = await requireRole(["super_admin"]);
  const supabase = await createSupabaseServerClient();
  const id = z.string().uuid().parse(data.get("id"));
  if (id === actor.id && data.get("role") !== "super_admin") throw new Error("Vous ne pouvez pas retirer votre propre rôle super administrateur.");
  const role = z.enum(["customer", "staff", "admin", "super_admin"]).parse(data.get("role"));
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/administrators");
}

export async function uploadMedia(data: FormData) {
  const profile = await requireRole();
  const supabase = await createSupabaseServerClient();
  const file = data.get("file");
  if (!(file instanceof File) || !file.size) throw new Error("Sélectionnez un fichier.");
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) throw new Error("Image invalide ou supérieure à 8 Mo.");
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const path = `uploads/${hash}.${extension}`;
  const { data: duplicate } = await supabase.from("media_assets").select("id").eq("bucket", "product-images").eq("storage_path", path).maybeSingle();
  if (duplicate) { revalidatePath("/admin/media"); return; }
  const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { error: assetError } = await supabase.from("media_assets").insert({ bucket: "product-images", storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size, uploaded_by: profile.id });
  if (assetError) throw new Error(assetError.message);
  revalidatePath("/admin/media");
}

export async function deleteMedia(data: FormData) {
  const supabase = await staffClient();
  const id = z.string().uuid().parse(data.get("id"));
  const { data: asset } = await supabase.from("media_assets").select("storage_path").eq("id", id).single();
  if (!asset) return;
  const { count: usageCount } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("storage_path", String(asset.storage_path));
  if (usageCount) throw new Error("Ce média est utilisé par un produit. Supprimez-le depuis la fiche produit.");
  const { error } = await supabase.storage.from("product-images").remove([String(asset.storage_path)]);
  if (error) throw new Error(error.message);
  await supabase.from("media_assets").delete().eq("id", id);
  revalidatePath("/admin/media");
}

export async function uploadProductImage(data: FormData) {
  const profile = await requireRole();
  const productId = z.string().uuid().parse(data.get("product_id"));
  const supabase = await createSupabaseServerClient();
  const files = [...data.getAll("files"), ...data.getAll("file")].filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!files.length) throw new Error("Sélectionnez au moins une image.");
  if (files.some((file) => !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024)) throw new Error("Chaque fichier doit être une image de 8 Mo maximum.");
  const { count: initialCount } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  let position = initialCount ?? 0;
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const path = `products/${productId}/${hash}.${extension}`;
    const { data: duplicate } = await supabase.from("product_images").select("id").eq("product_id", productId).eq("storage_path", path).maybeSingle();
    if (duplicate) continue;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) throw new Error(error.message);
    const primary = position === 0;
    const { error: rowError } = await supabase.from("product_images").insert({ product_id: productId, storage_path: path, alt_text: optional(data.get("alt_text")), sort_order: position, is_primary: primary });
    if (rowError) throw new Error(rowError.message);
    await supabase.from("media_assets").insert({ bucket: "product-images", storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size, alt_text: optional(data.get("alt_text")), uploaded_by: profile.id });
    if (primary) await supabase.from("products").update({ main_image_url: path }).eq("id", productId);
    position += 1;
  }
  revalidatePath(`/admin/products/${productId}`); revalidatePath("/", "layout");
}

export async function setPrimaryProductImage(data: FormData) {
  const supabase = await staffClient(); const productId = z.string().uuid().parse(data.get("product_id")); const imageId = z.string().uuid().parse(data.get("image_id"));
  const { data: image, error } = await supabase.from("product_images").select("storage_path").eq("id", imageId).eq("product_id", productId).single(); if (error) throw new Error(error.message);
  await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
  await supabase.from("product_images").update({ is_primary: true }).eq("id", imageId);
  await supabase.from("products").update({ main_image_url: String(image.storage_path) }).eq("id", productId);
  revalidatePath(`/admin/products/${productId}`); revalidatePath("/", "layout");
}

export async function deleteProductImage(data: FormData) {
  const supabase = await staffClient(); const productId = z.string().uuid().parse(data.get("product_id")); const imageId = z.string().uuid().parse(data.get("image_id"));
  const { data: image } = await supabase.from("product_images").select("storage_path,is_primary").eq("id", imageId).eq("product_id", productId).single(); if (!image) return;
  await supabase.storage.from("product-images").remove([String(image.storage_path)]);
  await supabase.from("product_images").delete().eq("id", imageId);
  await supabase.from("media_assets").delete().eq("storage_path", String(image.storage_path));
  if (image.is_primary) { const { data: next } = await supabase.from("product_images").select("id,storage_path").eq("product_id", productId).order("sort_order").limit(1).maybeSingle(); if (next) { await supabase.from("product_images").update({ is_primary: true }).eq("id", String(next.id)); await supabase.from("products").update({ main_image_url: String(next.storage_path) }).eq("id", productId); } else await supabase.from("products").update({ main_image_url: null }).eq("id", productId); }
  revalidatePath(`/admin/products/${productId}`); revalidatePath("/", "layout");
}

export async function saveProductAttribute(data: FormData) {
  const supabase = await staffClient(); const productId = z.string().uuid().parse(data.get("product_id")); const attributeId = z.string().uuid().parse(data.get("attribute_id")); const value = optional(data.get("value"));
  await supabase.from("product_attribute_values").delete().eq("product_id", productId).eq("attribute_id", attributeId);
  const optionId = optional(data.get("option_id"));
  if (value || optionId) { const { data: attribute } = await supabase.from("attributes").select("type").eq("id", attributeId).single(); const typedValue = attribute?.type === "select" ? { option_id: optionId } : attribute?.type === "number" ? { number_value: Number(value) } : attribute?.type === "boolean" ? { boolean_value: value === "true" } : { text_value: value }; const { error } = await supabase.from("product_attribute_values").insert({ product_id: productId, attribute_id: attributeId, ...typedValue }); if (error) throw new Error(error.message); }
  revalidatePath(`/admin/products/${productId}`); revalidatePath("/", "layout");
}

export async function saveVariant(data: FormData) {
  const supabase = await staffClient(); const id = optional(data.get("id")); const productId = z.string().uuid().parse(data.get("product_id"));
  const payload = { product_id: productId, name: z.string().min(1).parse(data.get("name")), sku: z.string().min(1).parse(data.get("sku")), barcode: optional(data.get("barcode")), price: optional(data.get("price")) ? number(data, "price") : null, compare_at_price: optional(data.get("compare_at_price")) ? number(data, "compare_at_price") : null, cost_price: optional(data.get("cost_price")) ? number(data, "cost_price") : null, is_active: checked(data, "is_active") };
  if (id) { const { error } = await supabase.from("product_variants").update(payload).eq("id", id); if (error) throw new Error(error.message); }
  else { const { data: variant, error } = await supabase.from("product_variants").insert(payload).select("id").single(); if (error) throw new Error(error.message); const { error: inventoryError } = await supabase.from("inventory").insert({ product_id: productId, variant_id: variant.id, quantity: number(data, "stock"), reserved_quantity: 0, low_stock_threshold: number(data, "low_stock_threshold", 5) }); if (inventoryError) throw new Error(inventoryError.message); }
  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteVariant(data: FormData) { const supabase = await staffClient(); const id = z.string().uuid().parse(data.get("id")); const productId = z.string().uuid().parse(data.get("product_id")); const { error } = await supabase.from("product_variants").delete().eq("id", id); if (error) throw new Error(error.message); revalidatePath(`/admin/products/${productId}`); }

export async function setProductImageOrder(data: FormData) { const supabase = await staffClient(); const productId = z.string().uuid().parse(data.get("product_id")); const imageId = z.string().uuid().parse(data.get("image_id")); const { error } = await supabase.from("product_images").update({ sort_order: number(data, "sort_order") }).eq("id", imageId).eq("product_id", productId); if (error) throw new Error(error.message); revalidatePath(`/admin/products/${productId}`); }
