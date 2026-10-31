export type VariantGalleryImage = { storage_path: string; alt_text?: string | null };
export function variantImageUrl(path: string) {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}` : "";
}
