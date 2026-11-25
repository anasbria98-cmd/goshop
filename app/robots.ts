import type { MetadataRoute } from "next";

const origin = "https://www.goelec.ma";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Public login forms must be crawlable for their noindex directive to work.
      // Longer Allow paths override /auth; callbacks and private routes stay blocked.
      allow: ["/", "/auth/sign-in", "/auth/sign-up"],
      disallow: [
        "/admin",
        "/api",
        "/auth",
        "/compte",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
