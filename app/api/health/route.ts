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
    const cuSkin = raw.filter(p => p.brand === "CU SKIN");
    const newCuSkin = cuSkin.filter(p => String(p.id).startsWith("cu-official-"));
    const photoCounts = {
      without_url: raw.filter(p => !String(p.image_url || "").trim()).length,
      live_active_missing_photo: products.filter(p => p.status === "active" && !String(p.image_url || "").trim()).length,
      raw_active_missing_photo: raw.filter(p => p.status === "active" && !String(p.image_url || "").trim()).length,
      auto_restored: raw.filter(p => String(p.image_url || "").includes("/products/official-auto/")).length,
      cu_skin: {
        total: cuSkin.length,
        with_official_photo: cuSkin.filter(p => String(p.image_url || "").includes("/products/cu-skin-official/")).length,
        without_photo: cuSkin.filter(p => !String(p.image_url || "").trim()).length,
        published: cuSkin.filter(p => p.status === "active").length,
        new_official_catalog_total: newCuSkin.length,
        new_official_catalog_published: newCuSkin.filter(p => p.status === "active").length,
        new_official_catalog_drafts: newCuSkin.filter(p => p.status === "draft").length,
        release_eligible: newCuSkin.filter(p => p.status === "draft" &&
          p.image_url?.startsWith("/shop-media/products/cu-skin-official/")).length,
      },
    };
    let cuOfficialSync: { checked: number; attached: number; created: number; kept: number; conflicts: number; failed: number } | null = null;
    let mediaSync: { attempts: number; attached: number; upgraded: number; unresolved: number; failed: number;
      last_attempt_unix: number | null; failure_categories?: Record<string, number> } | null = null;
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
        if(mediaSync) {
          // Public health exposes only categorical aggregate counts, never
          // supplier URLs, individual product names or sensitive D1 data.
          const categories = await (env.SHOP_DB as unknown as {
            prepare(sql:string): { all<T>(): Promise<{results:T[]}> }
          }).prepare(`
            SELECT
              CASE
                WHEN status IN ('attached','upgraded') THEN 'saved'
                WHEN detail LIKE '%HTTP 403%' OR detail LIKE '%HTTP 401%' THEN 'source_forbidden'
                WHEN detail LIKE '%HTTP 404%' THEN 'source_not_found'
                WHEN detail LIKE '%Redirect%' OR detail LIKE '%redirect%' THEN 'source_redirect'
                WHEN detail LIKE '%Source HTTP%' OR detail LIKE '%unavailable%' THEN 'source_network'
                WHEN detail LIKE '%title differs%' OR detail LIKE '%product title%' THEN 'identity_mismatch'
                WHEN detail LIKE '%No allowed main product image%' THEN 'image_not_found'
                WHEN detail LIKE '%Search returned no product links%' THEN 'search_no_results'
                WHEN detail LIKE '%No exact supplier image%' THEN 'previous_generic_failure'
                WHEN detail LIKE '%better%' THEN 'low_quality_source'
                ELSE 'other'
              END AS category, COUNT(*) AS total
            FROM shop_media_sync_attempts GROUP BY category
          `).all<{category:string;total:number}>();
          mediaSync.failure_categories = Object.fromEntries(
            (categories.results || []).map(item=>[item.category,Number(item.total)||0])
          );
        }
      } catch {
        // Cron may not have executed yet, in which case its audit table does not exist.
      }
    }
    if (usingCloudflareStore()) {
      try {
        const env = getCloudflareContext().env as unknown as {
          SHOP_DB?: {prepare(sql: string): {first<T>(): Promise<T | null>}}
        };
        const summary = await env.SHOP_DB?.prepare(
          "SELECT COUNT(*) AS checked, SUM(CASE WHEN status='attached' THEN 1 ELSE 0 END) AS attached, SUM(CASE WHEN status='created' THEN 1 ELSE 0 END) AS created, SUM(CASE WHEN status='kept' THEN 1 ELSE 0 END) AS kept, SUM(CASE WHEN status='conflict' THEN 1 ELSE 0 END) AS conflicts, SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) AS failed FROM shop_cuskin_official_sync"
        ).first<Record<"checked"|"attached"|"created"|"kept"|"conflicts"|"failed",number|null>>();
        if (summary) cuOfficialSync = {
          checked: Number(summary.checked||0),attached: Number(summary.attached||0),
          created: Number(summary.created||0),kept: Number(summary.kept||0),
          conflicts: Number(summary.conflicts||0),failed: Number(summary.failed||0),
        };
      } catch {
        // Safe before the first scheduled CU SKIN sync initializes its audit table.
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
      photo_health: { ...photoCounts, cron: mediaSync, cu_official_sync: cuOfficialSync },
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
