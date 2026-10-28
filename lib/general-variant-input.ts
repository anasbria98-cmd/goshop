import { z } from "zod";

const optionalPrice = z.preprocess(value => value === "" || value == null ? null : Number(value), z.number().finite().nonnegative().nullable());
export const generalVariantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(80),
  barcode: z.string().trim().max(80),
  price: optionalPrice,
  compare_at_price: optionalPrice,
  cost_price: optionalPrice,
  stock: z.coerce.number().int().nonnegative(),
  low_stock_threshold: z.coerce.number().int().nonnegative(),
  is_active: z.boolean(),
}).refine(row => row.compare_at_price == null || row.compare_at_price >= (row.price ?? 0), { message: "Le prix barré doit être supérieur ou égal au prix.", path: ["compare_at_price"] });
export type GeneralVariantInput = z.infer<typeof generalVariantSchema>;
export type GeneralVariantRow = Pick<GeneralVariantInput, "name" | "sku" | "price" | "is_active"> & { id: string };
export const generalVariantListSchema = z.array(generalVariantSchema).superRefine((rows, ctx) => {
  if (new Set(rows.map(row => row.sku)).size !== rows.length) ctx.addIssue({code:"custom",message:"Chaque variante doit avoir un SKU unique."});
});
export function generalVariantError(error: unknown) {
  if (error instanceof z.ZodError) return "Vérifiez le nom, le SKU, les prix et les quantités entières positives ou nulles. Le prix barré ne peut pas être inférieur au prix.";
  const value = error as {code?: string; message?: string};
  if (/duplicate key.*slug/i.test(value?.message ?? "")) return "Cette adresse produit existe déjà. Modifiez le champ « Adresse du produit ».";
  if (value?.code === "23505" || /duplicate key/i.test(value?.message ?? "")) return /barcode/i.test(value?.message ?? "") ? "Ce code-barres existe déjà." : "Ce SKU existe déjà. Choisissez un SKU unique.";
  if (/historique|réserv|introuvable|non autorisé|SKU existe|adresse produit existe/i.test(value?.message ?? "")) return value.message!;
  return "Impossible d’enregistrer la variante. Vos saisies sont conservées. Réessayez.";
}
