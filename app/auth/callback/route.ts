import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePostAuthPath } from "@/lib/auth-routing";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requested = request.nextUrl.searchParams.get("next");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      return NextResponse.redirect(new URL(resolvePostAuthPath(profile?.role, requested), request.url));
    }
  }
  return NextResponse.redirect(new URL("/auth/sign-in?error=Connexion impossible", request.url));
}
