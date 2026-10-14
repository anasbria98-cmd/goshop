import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProducts } from "@/lib/catalog";
import { resolveCartProduct } from "@/lib/product-variants";

const COOKIE = "goshop_cart_session";
async function owner(request: NextRequest) {
  const userClient = await createSupabaseServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  const existing = request.cookies.get(COOKIE)?.value;
  return { userId: user?.id ?? null, sessionId: existing && z.string().uuid().safeParse(existing).success ? existing : crypto.randomUUID(), isNew: !existing };
}
async function cartId(userId: string | null, sessionId: string) {
  const admin = createSupabaseAdminClient();
  if (userId) {
    const [{ data: userCart }, { data: guestCart }] = await Promise.all([
      admin.from("carts").select("id").eq("status", "active").eq("user_id", userId).maybeSingle(),
      admin.from("carts").select("id").eq("status", "active").eq("session_id", sessionId).maybeSingle(),
    ]);
    if (!userCart && guestCart) {
      const { error } = await admin.from("carts").update({ user_id: userId, session_id: null }).eq("id", guestCart.id);
      if (error) throw new Error(error.message);
      return guestCart.id;
    }
    if (userCart && guestCart && userCart.id !== guestCart.id) {
      const [{ data: ownedItems }, { data: guestItems }] = await Promise.all([
        admin.from("cart_items").select("id,product_id,variant_id,quantity").eq("cart_id", userCart.id),
        admin.from("cart_items").select("product_id,variant_id,quantity").eq("cart_id", guestCart.id),
      ]);
      for (const guestItem of guestItems ?? []) {
        const owned = ownedItems?.find((item) => item.product_id === guestItem.product_id && item.variant_id === guestItem.variant_id);
        if (owned) await admin.from("cart_items").update({ quantity: Math.min(99, Number(owned.quantity) + Number(guestItem.quantity)) }).eq("id", owned.id);
        else await admin.from("cart_items").insert({ cart_id: userCart.id, product_id: guestItem.product_id, variant_id: guestItem.variant_id, quantity: guestItem.quantity });
      }
      await admin.from("carts").update({ status: "converted" }).eq("id", guestCart.id);
    }
    if (userCart) return userCart.id;
  } else {
    const { data } = await admin.from("carts").select("id").eq("status", "active").eq("session_id", sessionId).maybeSingle();
    if (data) return data.id;
  }
  const { data: created, error } = await admin.from("carts").insert(userId ? { user_id: userId, status: "active" } : { session_id: sessionId, status: "active" }).select("id").single();
  if (error) throw new Error(error.message);
  return created.id;
}
function response(body: unknown, sessionId: string, isNew: boolean, status = 200) { const result = NextResponse.json(body, { status }); if (isNew) result.cookies.set(COOKIE, sessionId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" }); return result; }
export async function GET(request: NextRequest) { try { const current = await owner(request); const id = await cartId(current.userId, current.sessionId); const admin = createSupabaseAdminClient(); const { data: items, error } = await admin.from("cart_items").select("product_id,variant_id,quantity").eq("cart_id", id); if (error) throw error; const products = await getProducts(); const unavailableLineKeys: string[] = []; const lines = (items ?? []).flatMap((item) => { const product = products.find((candidate) => candidate.id === item.product_id); const selected = product ? resolveCartProduct(product, item.variant_id as string | null) : null; if (!selected && (item.variant_id || product?.hasColorVariants)) unavailableLineKeys.push(item.variant_id ? `${item.product_id}:${item.variant_id}` : String(item.product_id)); return selected ? [{ product: selected, quantity: item.quantity }] : []; }); return response({ lines, unavailableLineKeys }, current.sessionId, current.isNew); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur panier" }, { status: 500 }); } }
export async function PUT(request: NextRequest) { try { const origin = request.headers.get("origin"); if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Origine invalide" }, { status: 403 }); const parsed = z.object({ lines: z.array(z.object({ product_id: z.string().uuid(), variant_id: z.string().uuid().nullable().optional(), quantity: z.number().int().positive().max(99) })).max(100) }).parse(await request.json()); const current = await owner(request); const id = await cartId(current.userId, current.sessionId); const admin = createSupabaseAdminClient(); const productIds = parsed.lines.map((line) => line.product_id); if (productIds.length) { const { data: valid } = await admin.from("products").select("id").in("id", productIds).eq("status", "active"); const allowed = new Set((valid ?? []).map((product) => product.id)); if (allowed.size !== new Set(productIds).size) return response({ error: "Un produit n’est plus disponible" }, current.sessionId, current.isNew, 400); } if (parsed.lines.length) { const products = await getProducts(); const seen = new Set<string>(); for (const line of parsed.lines) { const product = products.find((p) => p.id === line.product_id); const key = `${line.product_id}:${line.variant_id ?? ""}`; if (!product || !resolveCartProduct(product, line.variant_id) || seen.has(key)) return response({ error: "Couleur indisponible ou ligne dupliquée" }, current.sessionId, current.isNew, 400); seen.add(key); } } const { error: deleteError } = await admin.from("cart_items").delete().eq("cart_id", id); if (deleteError) throw deleteError; if (parsed.lines.length) { const { error } = await admin.from("cart_items").insert(parsed.lines.map((line) => ({ cart_id: id, product_id: line.product_id, variant_id: line.variant_id ?? null, quantity: line.quantity }))); if (error) throw error; } return response({ ok: true }, current.sessionId, current.isNew); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur panier" }, { status: 400 }); } }
