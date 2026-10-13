"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePostAuthPath } from "@/lib/auth-routing";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signIn(formData: FormData) {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  const requestedNext = formData.get("next");
  const nextQuery = requestedNext ? `&next=${encodeURIComponent(String(requestedNext))}` : "";
  if (!parsed.success)
    redirect(`/auth/sign-in?error=${encodeURIComponent("Identifiants invalides")}${nextQuery}`);
  const supabase = await createSupabaseServerClient();
  const authResult = await (async () => {
    try {
      return await supabase.auth.signInWithPassword(parsed.data);
    } catch {
      return null;
    }
  })();
  if (!authResult)
    redirect(`/auth/sign-in?error=${encodeURIComponent("Service de connexion temporairement indisponible. Vérifiez votre connexion puis réessayez.")}${nextQuery}`);
  const { data: authData, error } = authResult;
  if (error)
    redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}${nextQuery}`);

  const profileResult = await (async () => {
    try {
      return await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
    } catch {
      return null;
    }
  })();
  if (!profileResult)
    redirect(`/auth/sign-in?error=${encodeURIComponent("Impossible de vérifier votre espace pour le moment. Réessayez dans quelques instants.")}${nextQuery}`);
  redirect(resolvePostAuthPath(profileResult.data?.role, requestedNext));
}

export async function signUp(formData: FormData) {
  const schema = credentials.extend({
    first_name: z.string().trim().min(2).max(80),
    last_name: z.string().trim().min(2).max(80),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(`/auth/sign-up?error=${encodeURIComponent("Vérifiez les informations saisies")}`);
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
      },
      emailRedirectTo: `${origin}/auth/callback?next=/compte`,
    },
  });
  if (error)
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);
  redirect("/auth/sign-in?message=Vérifiez votre e-mail pour activer votre compte");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
