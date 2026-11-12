import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { socialCrawlerPath } from "./lib/product-social-model";

export async function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
  const requestHost = (forwardedHost || request.headers.get("host") || "").split(":")[0].toLowerCase();
  if (requestHost === "goelec.ma") {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = "https:";
    canonicalUrl.host = "www.goelec.ma";
    return NextResponse.redirect(canonicalUrl, 308);
  }
  if (socialCrawlerPath(request.nextUrl.pathname, request.headers.get('user-agent') ?? '', request.method, request.headers.has('rsc'))) {
    const target=request.nextUrl.clone();
    target.pathname='/api/product-social/'+request.nextUrl.pathname.split('/')[2];
    target.search='';
    const response=NextResponse.rewrite(target);
    response.headers.set('Vary','User-Agent');
    response.headers.set('Cache-Control','no-store');
    return response;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  // Verify/refresh the token here; protected pages still fetch the current user
  // and check the database role. Asymmetric JWTs avoid an Auth network trip.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
