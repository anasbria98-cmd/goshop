import { z } from 'zod';

export const productColorSchema = z.object({name:z.string().trim().min(1).max(100),hex:z.string().regex(/^#[0-9a-fA-F]{6}$/)});
export const productColorsSchema = z.object({enabled:z.boolean(),colors:z.array(productColorSchema)});
export type ProductColor = z.infer<typeof productColorSchema>;
export type ProductColors = z.infer<typeof productColorsSchema>;

/** Null keeps existing variant previews; an explicit disabled/empty list hides them. */
export function visibleProductColors(value:unknown, variants:{colorName:string;colorHex:string}[] = []):ProductColor[] {
  if (value == null) return variants.map(v=>({name:v.colorName,hex:v.colorHex}));
  const result=productColorsSchema.safeParse(value);
  return result.success && result.data.enabled ? result.data.colors : [];
}
