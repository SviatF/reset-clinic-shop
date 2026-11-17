import { NextResponse } from "next/server";
import { readProducts } from "@/lib/commerce-json";
import { readCategories } from "@/lib/catalog-categories";
import { readBrands } from "@/lib/brands-store";
import { jsonStoreWriteAvailable, usingCloudflareStore } from "@/lib/json-store";
import { shopMediaBucket } from "@/lib/r2-media";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readJsonStore, PRODUCTS_PATH } from "@/lib/json-store";
import type { ProductRecord } from "@/lib/commerce-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const writable = await jsonStoreWriteAvailable();
  const storage = usingCloudflareStore() && process.env.SHOP_PRODUCTS_BACKEND === "d1"
    ? "d1"
    : process.env.SHOP_DATA_DIR
      ? "local"
      : writable ? "github" : process.env.SHOP_STAGING === "true" ? "bundled-readonly" : "unavailable";

  try {
    const [products, categories, brands, rawCatalog] = await Promise.all([
      readProducts(), readCategories(), readBrands(),
      readJsonStore<ProductRecord[]>(PRODUCTS_PATH, []),
    ]);
    // Public read-only aggregate; never expose product records or API tokens.
    const raw = rawCatalog.data.filter(p => p.slug !== "parsley-seed-anti-oxidant-eye-cream");
    const photoCounts = {
      without_url: raw.filter(p => !String(p.image_url || "").trim()).length,
      auto_restored: raw.filter(p => String(p.image_url || "").includes("/products/official-auto/")).length,
    };
    let mediaSync: { attempts: number; attached: number; upgraded: number; unresolved: number; failed: number;
      last_attempt_unix: number | null } | null = null;
    if (usingCloudflareStore()) {
      try {
        const env = getCloudflareContext().env as unknown as {
          SHOP_DB?: { prepare(sql: string): { first<T>(): Promise<T | null> } }
        };
        const summary = await env.SHOP_DB?.prepare(
          "SELECT COUNT(*) AS attempts, SUM(CASE WHEN status='attached' THEN 1 ELSE 0 END) AS attached, SUM(CASE WHEN status='upgraded' THEN 1 ELSE 0 END) AS upgraded, SUM(CASE WHEN status='unresolved' THEN 1 ELSE 0 END) AS unresolved, SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) AS failed, MAX(checked_at) AS last_attempt_unix FROM shop_media_sync_attempts"
        ).first<{ attempts: number; attached: number | null; upgraded: number | null; unresolved: number | null;
          failed: number | null; last_attempt_unix: number | null }>();
        if (summary) mediaSync = {
          attempts: Number(summary.attempts || 0),
          attached: Number(summary.attached || 0),
          upgraded: Number(summary.upgraded || 0),
          unresolved: Number(summary.unresolved || 0),
          failed: Number(summary.failed || 0),
          last_attempt_unix: summary.last_attempt_unix || null,
        };
      } catch {
        // Cron may not have executed yet, in which case its audit table does not exist.
      }
    }
    return NextResponse.json({
      status: "ok",
      media: process.env.SHOP_MEDIA_BACKEND === "r2" && Boolean(shopMediaBucket()) ? "r2" : "legacy",
      service: "reset-clinic-shop-sasha",
      staging: process.env.SHOP_STAGING === "true",
      storage,
      writable,
      totals: { products: products.length, categories: categories.length, brands: brands.length },
      photo_health: { ...photoCounts, cron: mediaSync },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Staging health catalog failure", error);
    return NextResponse.json({
      status: "degraded",
      service: "reset-clinic-shop-sasha",
      storage,
      error: error instanceof Error ? error.message.split(":")[0].slice(0, 80) : "STORE_UNKNOWN",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
