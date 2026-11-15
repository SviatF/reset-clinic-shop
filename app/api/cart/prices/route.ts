import { NextResponse } from "next/server";
import { readProducts } from "@/lib/commerce-json";
import { certificateFromSlug } from "@/lib/certificate-products";
import { getProductPricing } from "@/lib/product-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sync an existing browser cart with current sale prices; the bank always
 * independently calculates authoritative charges through normalizeOrder(). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const slugs = body?.slugs;
    if (!Array.isArray(slugs) || slugs.length > 50 || slugs.some((slug: unknown) => typeof slug !== "string" || slug.length > 180))
      return NextResponse.json({ error: "Некоректний кошик" }, { status: 400 });
    const products = await readProducts();
    const bySlug = new Map(products.filter((item) => item.status === "active").map((item) => [item.slug, item]));
    const prices: Record<string, number> = {};
    for (const slug of slugs as string[]) {
      const certificate = certificateFromSlug(slug);
      if (certificate) {
        prices[slug] = certificate.price;
        continue;
      }
      const item = bySlug.get(slug);
      if (item) prices[slug] = getProductPricing(item).price;
    }
    return NextResponse.json({ prices }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Не вдалося перевірити актуальні ціни" }, { status: 503 });
  }
}
