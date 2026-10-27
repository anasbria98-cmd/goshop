import type { BrandRow } from "./database.types";

export type FeaturedBrand = Pick<BrandRow, "id" | "slug" | "name" | "logo_url" | "display_order">;

export type FeaturedBrandLayout = { brands: FeaturedBrand[]; slotCount: number };

/** Positions are slots, not ranks: hidden/unassigned slots never pull later logos forward. */
export function featuredBrandSlots(brands: FeaturedBrand[], slotCount = 0): (FeaturedBrand | null)[] {
  const positions = new Map<number, FeaturedBrand>();
  const ids = new Set<string>();
  for (const brand of brands) {
    const position = brand.display_order;
    if (position === null || !Number.isInteger(position) || position < 1 || position > 1000 || ids.has(brand.id) || positions.has(position)) continue;
    positions.set(position, brand);
    ids.add(brand.id);
  }
  return Array.from({ length: Math.max(0, Math.min(1000, slotCount), ...positions.keys()) }, (_, index) => positions.get(index + 1) ?? null);
}
