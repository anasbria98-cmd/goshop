import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import type { AppRole, ProfileRow } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// React cache is scoped to one server render, never shared between users.
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<ProfileRow | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
});

export async function requireUser(next = "/compte") {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireRole(
  roles: AppRole[] = ["staff", "admin", "super_admin"],
) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/sign-in?next=/admin");
  if (!roles.includes(profile.role)) redirect("/");
  return profile;
}
