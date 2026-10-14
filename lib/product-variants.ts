import type { CatalogProduct, CatalogVariant } from "./catalog-model";

type VariantCategory = { id: string; slug: string; parent_id?: string | null; parentId?: string | null };

/** Category membership, including descendants and secondary assignments. */
export function isAppareillage(categoryIds: string[], categories: VariantCategory[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return categoryIds.some((id) => {
    let category = byId.get(id);
    const visited = new Set<string>();
    while (category && !visited.has(category.id)) {
      if (category.slug === "appareillage") return true;
      visited.add(category.id);
      category = byId.get(category.parent_id ?? category.parentId ?? "");
    }
    return false;
  });
}

export function cartLineKey(product: CatalogProduct) {
  return product.selectedVariant ? `${product.id}:${product.selectedVariant.id}` : product.id;
}

export function selectProductVariant(product: CatalogProduct, variant: CatalogVariant): CatalogProduct {
  return { ...product, selectedVariant: variant, sku: variant.sku, price: variant.price,
    compareAtPrice: variant.compareAtPrice, stock: variant.stock, imageUrl: variant.imageUrl };
}

export function initialProductVariant(product: CatalogProduct) {
  const available = (variant: CatalogVariant) => variant.stock > 0 || product.allowBackorder;
  return product.variants?.find((variant) => available(variant) && variant.imageUrl === product.imageUrl)
    ?? product.variants?.find(available)
    ?? product.variants?.[0];
}

export function resolveCartProduct(product: CatalogProduct, variantId?: string | null) {
  if (!variantId) return product.hasColorVariants ? null : product;
  const variant = product.variants?.find((item) => item.id === variantId);
  return variant ? selectProductVariant(product, variant) : null;
}
