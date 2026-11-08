import type { MetadataRoute } from "next";

export function siteUrl() {
  const value = process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://sakkarepe.com";
  return value.replace(/\/+$/, "");
}

export function buildRobots(baseUrl: string): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/admin", "/pesanan", "/api"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

export default function robots(): MetadataRoute.Robots {
  return buildRobots(siteUrl());
}
