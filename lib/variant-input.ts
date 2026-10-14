import { z } from "zod";

export const colorVariantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  color_name: z.string().trim().min(1).max(80),
  color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  finish: z.string().trim().max(80),
  image_path: z.string().regex(/^variants\/[a-zA-Z0-9_/-]+\.(png|jpe?g|webp)$/),
  sku: z.string().trim().min(1).max(80),
  barcode: z.string().trim().max(80),
  price: z.number().finite().nonnegative().nullable(),
  compare_at_price: z.number().finite().nonnegative().nullable().optional(),
  is_active: z.boolean(),
  stock: z.number().int().nonnegative().nullable(),
  expected_stock: z.number().int().nullable(),
});

export const colorVariantListSchema = z.array(colorVariantSchema).superRefine((rows, context) => {
  const ids = new Set<string>();
  const skus = new Set<string>();
  for (const row of rows) {
    if ((row.id && ids.has(row.id)) || skus.has(row.sku)) context.addIssue({ code: "custom", message: "Chaque couleur doit avoir un SKU unique." });
    if (row.id) ids.add(row.id);
    skus.add(row.sku);
  }
});

export type ColorVariantDraft = Omit<z.infer<typeof colorVariantSchema>, "price" | "compare_at_price" | "stock" | "expected_stock"> & {
  price: string;
  compare_at_price?: string;
  stock: number;
  expected_stock: number;
  reserved: number;
  dirty: boolean;
};
