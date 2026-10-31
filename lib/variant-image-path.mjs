import { z } from "zod";

/** Only paths in the existing product-images bucket, never arbitrary URLs. */
export const variantImagePathSchema = z.string().regex(/^(?:|(?:variants|products|uploads)\/[a-zA-Z0-9_/-]+\.(?:png|jpe?g|webp))$/);
