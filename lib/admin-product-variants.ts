import "server-only";
import { createSupabaseServerClient } from "./supabase/server";
import type { ColorVariantDraft } from "./variant-input";

export async function getAdminColorVariants(productId?: string) {
  const supabase = await createSupabaseServerClient();
  // The API's default page limit must not hide later products' colors in the editor.
  async function allVariants() {
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from("product_variants").select("*").order("created_at").order("id").range(offset, offset + 999);
      if (error) throw new Error(error.message);
      rows.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) return rows;
    }
  }
  const [{ data: variants, error }, { data: inventory, error: stockError }] = await Promise.all([
    allVariants().then((data) => ({ data, error: null })),
    productId ? supabase.from("inventory").select("variant_id,quantity,reserved_quantity").eq("product_id", productId).not("variant_id", "is", null) : Promise.resolve({ data: [], error: null }),
  ]);
  if (error || stockError) throw new Error((error ?? stockError)!.message);
  const choices = [...new Map((variants ?? []).filter((v) => v.color_name && v.color_hex).map((v) => [String(v.color_name), { name: String(v.color_name), hex: String(v.color_hex) }])).values()];
  const rows: ColorVariantDraft[] = (variants ?? []).filter((v) => v.product_id === productId).map((v) => {
    const stock = inventory?.find((i) => i.variant_id === v.id);
    return { id: String(v.id), name: String(v.name), sku: String(v.sku), barcode: String(v.barcode ?? ""),
      price: v.price == null ? "" : String(v.price), compare_at_price: v.compare_at_price == null ? "" : String(v.compare_at_price), color_name: String(v.color_name ?? ""), color_hex: String(v.color_hex ?? "#ffffff"),
      finish: String(v.finish ?? ""), image_path: String(v.image_path ?? ""), is_active: Boolean(v.is_active),
      stock: stock?.quantity ?? 0, expected_stock: stock?.quantity ?? 0, reserved: stock?.reserved_quantity ?? 0, dirty: false };
  });
  return { rows, choices };
}
