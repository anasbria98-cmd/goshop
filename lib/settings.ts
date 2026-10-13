import "server-only";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

export type PublicStoreSettings = Record<string, Json>;

export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  if (!hasSupabaseEnv()) return {};
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("store_settings").select("key,value").eq("is_public", true);
  if (error) throw new Error(`Impossible de charger les paramètres publics: ${error.message}`);
  return Object.fromEntries((data ?? []).map((setting: { key: string; value: Json }) => [setting.key, setting.value]));
}
