import type { MetadataRoute } from "next";

const origin = "https://www.goelec.ma";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
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
