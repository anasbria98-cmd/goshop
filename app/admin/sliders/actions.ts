"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slideInput } from "@/lib/slide-input";
import type { HomeSlideRow, SlideLocation } from "@/lib/home-slides";

async function client() { await requireRole(["admin", "super_admin"]); return createSupabaseServerClient(); }
function refresh() { revalidatePath("/admin/sliders"); revalidatePath("/"); }
function failure(error: unknown) { unstable_rethrow(error); return { error: error instanceof Error ? error.message : "Une erreur est survenue. Réessayez." }; }

export async function saveSlide(input: unknown): Promise<{ error?: string; slide?: HomeSlideRow }> {
  try {
    const db = await client();
    const parsed = slideInput.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues.map((issue) => issue.message).join(" ") };
    const { id, ...row } = parsed.data;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (!/^\/promotions\/[a-z0-9-]+\.png$/.test(row.image_url)) {
      const prefix = `${base}/storage/v1/object/public/homepage-slides/`;
      if (!row.image_url.startsWith(prefix)) return { error: "Importez l’image dans la bibliothèque des sliders." };
      const path = row.image_url.slice(prefix.length);
      if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(path)) return { error: "Chemin d’image invalide." };
      const { data: files, error } = await db.storage.from("homepage-slides").list("", { search: path });
      if (error || !files?.some((file) => file.name === path)) return { error: "L’image importée est introuvable." };
    }
    if (row.link_type === "product") {
      const { data } = await db.from("products").select("id").eq("id", row.product_id!).eq("status", "active").not("published_at", "is", null).maybeSingle();
      if (!data) return { error: "Choisissez un produit publié." };
    }
    if (row.link_type === "category") {
      const { data } = await db.from("categories").select("id").eq("id", row.category_id!).eq("is_active", true).maybeSingle();
      if (!data) return { error: "Choisissez une catégorie active." };
    }
    const payload = { ...row, category_id: row.link_type === "category" ? row.category_id : null, product_id: row.link_type === "product" ? row.product_id : null, custom_url: row.link_type === "custom" ? row.custom_url : null };
    let sort_order: number | undefined;
    const { data: current } = id ? await db.from("homepage_slides").select("location").eq("id", id).maybeSingle() : { data: null };
    if (id && !current) return { error: "Cette bannière n’existe plus. Rechargez la liste." };
    if (!id || current?.location !== row.location) {
      const { data, error } = await db.from("homepage_slides").select("sort_order").eq("location", row.location).order("sort_order", { ascending: false }).limit(1);
      if (error) throw new Error(error.message);
      sort_order = (data?.[0]?.sort_order ?? -1) + 1;
    }
    const mutation = { ...payload, ...(sort_order !== undefined ? { sort_order } : {}) };
    const { data, error } = await (id ? db.from("homepage_slides").update(mutation).eq("id", id) : db.from("homepage_slides").insert(mutation)).select("*").single();
    if (error) throw new Error(error.message);
    refresh(); return { slide: data };
  } catch (error) { return failure(error); }
}
export async function deleteSlide(id: string): Promise<{ error?: string }> {
  try { const db = await client(); const { data, error } = await db.from("homepage_slides").delete().eq("id", z.uuid().parse(id)).select("id").single(); if (error || !data) throw new Error("Suppression impossible. Rechargez la liste."); refresh(); return {}; } catch (error) { return failure(error); }
}
export async function toggleSlide(id: string, active: boolean): Promise<{ error?: string }> {
  try { const db = await client(); const { error } = await db.from("homepage_slides").update({ is_active: z.boolean().parse(active) }).eq("id", z.uuid().parse(id)).select("id").single(); if (error) throw new Error(error.message); refresh(); return {}; } catch (error) { return failure(error); }
}
export async function reorderSlides(location: SlideLocation, ids: string[]): Promise<{ error?: string }> {
  try { const db = await client(); const { error } = await db.rpc("reorder_homepage_slides", { p_location: z.enum(["primary", "secondary"]).parse(location), p_ids: z.array(z.uuid()).max(200).parse(ids) }); if (error) throw new Error("L’ordre n’a pas été enregistré. Rechargez la liste puis réessayez."); refresh(); return {}; } catch (error) { return failure(error); }
}
