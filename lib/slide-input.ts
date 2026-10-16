import { z } from "zod";
import { safeSlideLink } from "./home-slides";
export const slideInput = z.object({
  id: z.uuid().optional(), name: z.string().trim().min(1).max(120), alt: z.string().trim().min(1).max(300),
  image_url: z.string().min(1).max(2000), location: z.enum(["primary", "secondary"]),
  link_type: z.enum(["none", "category", "product", "custom"]), category_id: z.uuid().nullable(), product_id: z.uuid().nullable(),
  custom_url: z.string().max(2000).nullable(), is_active: z.boolean(),
}).superRefine((value, ctx) => {
  if (value.link_type === "category" && !value.category_id) ctx.addIssue({ code: "custom", message: "Choisissez une catégorie." });
  if (value.link_type === "product" && !value.product_id) ctx.addIssue({ code: "custom", message: "Choisissez un produit." });
  if (value.link_type === "custom" && (!value.custom_url || !safeSlideLink(value.custom_url))) ctx.addIssue({ code: "custom", message: "Le lien doit commencer par /, https:// ou http:// (sans espace)." });
});
