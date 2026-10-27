"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BrandSlot } from "@/lib/brand-layout";

export async function saveBrandLayout(expected: BrandSlot[], slots: BrandSlot[]): Promise<{ error?: string }> {
  try {
    await requireRole();
    const schema = z.array(z.uuid().nullable()).max(1000);
    const proposed = schema.parse(slots);
    const previous = schema.parse(expected);
    const ids = proposed.filter((id): id is string => id !== null);
    if (new Set(ids).size !== ids.length) return { error: "Une marque ne peut apparaître qu’une seule fois." };
    const db = await createSupabaseServerClient();
    const { error } = await db.rpc("save_featured_brand_layout", { p_expected: previous, p_slots: proposed });
    if (error) return { error: error.message.includes("LAYOUT_CHANGED") || error.message.includes("BRAND_NOT_FOUND") ? "Les marques ont changé. Rechargez la page avant de réessayer." : "La disposition n’a pas été enregistrée. Réessayez." };
    revalidatePath("/admin/brands"); revalidatePath("/", "layout");
    return {};
  } catch (error) {
    unstable_rethrow(error);
    return { error: "La disposition n’a pas été enregistrée. Vérifiez votre connexion puis réessayez." };
  }
}
