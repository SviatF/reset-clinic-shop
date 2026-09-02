import type { MetadataRoute } from "next";
import { product } from "@/lib/product";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/face", changeFrequency: "weekly", priority: 0.9 },
    { path: "/body", changeFrequency: "weekly", priority: 0.85 },
    { path: "/hair", changeFrequency: "weekly", priority: 0.85 },
    { path: "/catalog", changeFrequency: "weekly", priority: 0.8 },
    { path: `/product/${product.slug}`, changeFrequency: "weekly", priority: 0.95 },
    { path: "/certificate", changeFrequency: "monthly", priority: 0.7 },
    { path: "/consultation", changeFrequency: "monthly", priority: 0.75 },
    { path: "/philosophy", changeFrequency: "monthly", priority: 0.6 },
    { path: "/advantages", changeFrequency: "monthly", priority: 0.6 },
    { path: "/contacts", changeFrequency: "monthly", priority: 0.7 },
    { path: "/clients/delivery", changeFrequency: "monthly", priority: 0.5 },
    { path: "/clients/returns", changeFrequency: "monthly", priority: 0.5 },
    { path: "/clients/faq", changeFrequency: "monthly", priority: 0.65 },
  ];

  return entries.map((entry) => ({
    url: absoluteUrl(entry.path),
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
