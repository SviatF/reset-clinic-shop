import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/seo";

/** Allow Google to crawl the canonical shop domain even while checkout stays in staging mode.
 * Keep workers.dev and other preview domains closed to indexing.
 */
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
 const host=(await headers()).get("host")?.toLowerCase().trim() || "";
 const canonicalHost=new URL(SITE_URL).host.toLowerCase();
 const isCanonicalDomain=host===canonicalHost;
 if (!isCanonicalDomain || process.env.SEO_NOINDEX==="true") {
  return {rules:[{userAgent:"*",disallow:"/"}]};
 }
 return {
  rules:{
   userAgent:"*",
   allow:"/",
   disallow:["/admin","/admin/","/api/","/account","/cart","/checkout","/payment/"]
  },
  sitemap:SITE_URL+"/sitemap.xml",
  host:SITE_URL
 };
}
