import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { mutateProducts, missingBundledProducts, bundledProductCount } from "@/lib/commerce-json";
import { PRODUCTS_PATH, readJsonStore, usingCloudflareStore } from "@/lib/json-store";
import type { ProductRecord } from "@/lib/commerce-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stagingD1() {
  return process.env.SHOP_STAGING === "true"
    && usingCloudflareStore()
    && process.env.SHOP_PRODUCTS_BACKEND === "d1";
}

export async function GET() {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stagingD1())
    return NextResponse.json({ available: false, persisted: 0, visible: 0, needsRecovery: false });

  try {
    const stored = (await readJsonStore<ProductRecord[]>(PRODUCTS_PATH, [])).data;
    const persisted = stored.length;
    const missing = missingBundledProducts(stored).length;
    return NextResponse.json({
      available: true, persisted, visible: persisted + missing, missing,
      needsRecovery: missing > 0, sourceTotal: bundledProductCount,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Catalog recovery status failed", error);
    return NextResponse.json({ error: "Не вдалося перевірити дані D1" }, { status: 503 });
  }
}

export async function POST() {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stagingD1())
    return NextResponse.json({ error: "Перенесення дозволено лише на тестовій базі D1" }, { status: 409 });

  try {
    // Explicit, idempotent user-initiated migration. No writes to the source
    // repository and no replacement of D1 records that were already edited.
    const before = (await readJsonStore<ProductRecord[]>(PRODUCTS_PATH, [])).data.length;
    await mutateProducts("Import missing products from bundled source snapshot", rows => [
      ...rows,
      ...missingBundledProducts(rows),
    ]);
    const stored = (await readJsonStore<ProductRecord[]>(PRODUCTS_PATH, [])).data;
    return NextResponse.json({
      ok: true,
      before,
      persisted: stored.length,
      added: stored.length - before,
      missing: missingBundledProducts(stored).length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Catalog recovery failed", error);
    return NextResponse.json({ error: "Не вдалося записати товари до D1" }, { status: 503 });
  }
}
