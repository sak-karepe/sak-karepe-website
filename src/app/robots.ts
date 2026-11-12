import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/assets";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: ["/admin", "/pesanan", "/api"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
