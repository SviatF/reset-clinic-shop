import { NextResponse } from "next/server";
import { readProducts } from "@/lib/commerce-json";
import { readCategories } from "@/lib/catalog-categories";
import { readBrands } from "@/lib/brands-store";
import { jsonStoreWriteAvailable, usingCloudflareStore } from "@/lib/json-store";
import { shopMediaBucket } from "@/lib/r2-media";

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
    const [products, categories, brands] = await Promise.all([
      readProducts(), readCategories(), readBrands(),
    ]);
    return NextResponse.json({
      status: "ok",
      media: process.env.SHOP_MEDIA_BACKEND === "r2" && Boolean(shopMediaBucket()) ? "r2" : "legacy",
      service: "reset-clinic-shop-sasha",
      staging: process.env.SHOP_STAGING === "true",
      storage,
      writable,
      totals: { products: products.length, categories: categories.length, brands: brands.length },
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
