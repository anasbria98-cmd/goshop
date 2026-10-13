import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getPublicSupabaseEnv, getSecretSupabaseKey } from "@/lib/env";

export function createSupabaseAdminClient() {
  const { url } = getPublicSupabaseEnv();
  return createClient<Database>(url, getSecretSupabaseKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
