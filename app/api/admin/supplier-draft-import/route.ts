import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { PRODUCTS_PATH, readJsonStore, mutateJsonStore, usingCloudflareStore } from "@/lib/json-store";
import type { ProductRecord } from "@/lib/commerce-types";
import sourceCatalog from "@/data/products.json";
import sourceImport from "@/data/supplier-import-2026-11-11.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceItem = { slug: string; brand: string };
const imported = sourceImport.items as SourceItem[];
const catalog = sourceCatalog as ProductRecord[];

function isStagingD1(): boolean {
  return process.env.SHOP_STAGING === "true"
    && usingCloudflareStore()
    && process.env.SHOP_PRODUCTS_BACKEND === "d1";
}

function sourceDrafts(): ProductRecord[] {
  const sourceBySlug = new Map(catalog.map(item => [item.slug, item]));
  const uniqueSlugs = new Set<string>();
  const uniqueIds = new Set<string>();
  const selected: ProductRecord[] = [];
  for (const entry of imported) {
    const product = sourceBySlug.get(entry.slug);
    if (!product || product.brand !== entry.brand
      || product.status !== "draft"
      || product.track_stock !== true
      || product.stock_quantity !== 0
      || product.published_at !== null
      || uniqueSlugs.has(product.slug)
      || uniqueIds.has(product.id)) {
      throw new Error("INVALID_SUPPLIER_DRAFT_SNAPSHOT");
    }
    uniqueSlugs.add(product.slug);
    uniqueIds.add(product.id);
    selected.push(product);
  }
  if (selected.length !== 114) throw new Error("UNEXPECTED_SUPPLIER_IMPORT_COUNT");
  return selected;
}

function missingDrafts(stored: ProductRecord[], source: ProductRecord[]) {
  const slugs = new Set(stored.map(item => item.slug));
  const ids = new Set(stored.map(item => item.id));
  return source.filter(item => !slugs.has(item.slug) && !ids.has(item.id));
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStagingD1()) {
    return NextResponse.json({
      available: false,
      sourceCount: imported.length,
      missing: null,
      reason: "Потрібні SHOP_STAGING=true, SHOP_STORAGE_BACKEND=cloudflare, SHOP_PRODUCTS_BACKEND=d1",
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const source = sourceDrafts();
    const stored = (await readJsonStore<ProductRecord[]>(PRODUCTS_PATH, [])).data;
    if (!Array.isArray(stored)) throw new Error("INVALID_D1_PRODUCTS_DOCUMENT");
    const missing = missingDrafts(stored, source);
    return NextResponse.json({
      available: true,
      sourceCount: source.length,
      missing: missing.length,
      alreadyPresent: source.length - missing.length,
      persisted: stored.length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Supplier import preview failed", error);
    return NextResponse.json({ error: "Не вдалося перевірити товари в D1" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStagingD1()) {
    return NextResponse.json({ error: "Імпорт дозволений лише в налаштованій staging D1" }, { status: 409 });
  }
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  let body: { confirm?: string };
  try {
    body = await request.json() as { confirm?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.confirm !== "IMPORT_114_SUPPLIER_DRAFTS") {
    return NextResponse.json({ error: "Explicit confirmation is required" }, { status: 400 });
  }

  try {
    const source = sourceDrafts();
    let added = 0;
    await mutateJsonStore<ProductRecord[]>(
      PRODUCTS_PATH,
      [],
      "Admin: append verified-source supplier catalog draft candidates",
      rows => {
        if (!Array.isArray(rows)) throw new Error("INVALID_D1_PRODUCTS_DOCUMENT");
        const missing = missingDrafts(rows, source);
        added = missing.length;
        return [...rows, ...missing];
      },
    );
    const persisted = (await readJsonStore<ProductRecord[]>(PRODUCTS_PATH, [])).data;
    return NextResponse.json({
      ok: true,
      sourceCount: source.length,
      added,
      alreadyPresent: source.length - missingDrafts(persisted, source).length,
      missing: missingDrafts(persisted, source).length,
      persisted: persisted.length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Supplier import failed", error);
    return NextResponse.json({ error: "Не вдалося зберегти чернетки у D1. Дані не можна вважати імпортованими." }, { status: 503 });
  }
}
