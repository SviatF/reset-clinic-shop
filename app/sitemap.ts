import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { getStoreProducts } from "@/lib/store-products";

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
  const products = await getStoreProducts({ limit: 100 });
  for (const item of products) entries.push({ path: `/product/${item.slug}`, changeFrequency: "weekly", priority: 0.95, lastModified: item.updatedAt ? new Date(item.updatedAt) : now });
  return entries.map((entry) => ({ url: absoluteUrl(entry.path), lastModified: entry.lastModified || now, changeFrequency: entry.changeFrequency, priority: entry.priority }));
}
