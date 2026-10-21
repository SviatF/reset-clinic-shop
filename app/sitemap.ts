import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { getAllProductRecords } from "@/lib/store-products";
import { readCategories } from "@/lib/catalog-categories";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number; lastModified?: Date }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/face", changeFrequency: "weekly", priority: 0.9 },
    { path: "/body", changeFrequency: "weekly", priority: 0.85 },
    { path: "/hair", changeFrequency: "weekly", priority: 0.85 },
    { path: "/catalog", changeFrequency: "weekly", priority: 0.8 },
    { path: "/certificate", changeFrequency: "monthly", priority: 0.7 },
    { path: "/consultation", changeFrequency: "monthly", priority: 0.75 },
    { path: "/philosophy", changeFrequency: "monthly", priority: 0.6 },
    { path: "/advantages", changeFrequency: "monthly", priority: 0.6 },
    { path: "/contacts", changeFrequency: "monthly", priority: 0.7 },
    { path: "/clients/delivery", changeFrequency: "monthly", priority: 0.5 },
    { path: "/clients/returns", changeFrequency: "monthly", priority: 0.5 },
    { path: "/clients/faq", changeFrequency: "monthly", priority: 0.65 },
  ];
  const categories=await readCategories();
  for(const group of categories.filter(c=>c.parent_slug&&c.status==="active"))entries.push({path:`/${group.parent_slug}/${group.slug}`,changeFrequency:"weekly",priority:0.75});
  const products = (await getAllProductRecords()).filter(item=>item.status==="active");
  for (const item of products) entries.push({ path: `/product/${item.slug}`, changeFrequency: "weekly", priority: 0.8, lastModified: item.updated_at ? new Date(item.updated_at) : now });
  return entries.map((entry) => ({ url: absoluteUrl(entry.path), lastModified: entry.lastModified || now, changeFrequency: entry.changeFrequency, priority: entry.priority }));
}
