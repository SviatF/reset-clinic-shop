import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (process.env.SHOP_STAGING === "true") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/api/",
        "/account",
        "/cart",
        "/checkout",
        "/payment/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
