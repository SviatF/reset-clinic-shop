import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { appendActivity } from "@/lib/commerce-json";
import type { ProductRecord } from "@/lib/commerce-types";
import { PRODUCTS_PATH, readJsonStore, mutateJsonStore, jsonStoreWriteConfigured } from "@/lib/json-store";
import { applyCuskinImport, cuskinImportPlan, validateCuskinRows } from "@/lib/cuskin-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
function fingerprint(rows: ProductRecord[]) {
  // D1 catalog content version: reject any concurrent changes before import.
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return response({ error: "Unauthorized" }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return response({ error: "Недозволене джерело запиту" }, 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.mode !== "preview" && body.mode !== "commit") throw new Error("Некоректний режим імпорту");
    if (body.packageFormat !== "reset-clinic-cuskin-import-v1")
      throw new Error("Цей пакет не належить до перевіреного формату CU SKIN");
    const rows = validateCuskinRows(body.products);
    const current = (await readJsonStore<ProductRecord[]>(PRODUCTS_PATH, [])).data;
    const plan = cuskinImportPlan(current, rows);
    if (body.mode === "preview") {
      return response({
        ok: true, preview: true, revision: fingerprint(current),
        create: plan.filter(p => p.kind === "create").length,
        enrich: plan.filter(p => p.kind === "enrich").length,
        skip: plan.filter(p => p.kind === "skip").length,
        conflict: plan.filter(p => p.kind === "conflict").length,
        plan,
      });
    }
    if (!jsonStoreWriteConfigured()) return response({ error: "D1 недоступна для запису" }, 503);
    const revision = body.revision;
    if (typeof revision !== "string" || !/^[a-f0-9]{64}$/.test(revision))
      throw new Error("Спочатку перевірте імпорт");
    const baselinePlan = cuskinImportPlan(current, rows);
    if (fingerprint(current) !== revision)
      return response({ error: "Каталог змінився. Оновіть попередній перегляд." }, 409);
    if (baselinePlan.filter(p => p.kind === "conflict").length > 0 && body.confirmConflicts !== true)
      throw new Error("Є сумнівні збіги товарів: підтвердьте їх пропуск перед імпортом");
    const missingPhotos = baselinePlan.filter(p =>
      (p.kind === "create" || p.kind === "enrich") && p.needsPhoto &&
      !rows.find(row => row.sku === p.sku)?.image_url?.startsWith("/shop-media/products/"));
    if (missingPhotos.length) throw new Error("Не всі фотографії завантажено у R2: " + missingPhotos.map(p => p.sku).join(", "));
    let counts = { created: 0, enriched: 0 };
    await mutateJsonStore<ProductRecord[]>(
      PRODUCTS_PATH, [], "Admin: import CU SKIN verified workbook",
      items => {
        if (fingerprint(items) !== revision)
          throw new Error("PREVIEW_EXPIRED: Каталог змінено під час імпорту. Оновіть перевірку.");
        const freshPlan = cuskinImportPlan(items, rows);
        if (freshPlan.filter(p=>p.kind === "conflict").length !== baselinePlan.filter(p=>p.kind === "conflict").length)
          throw new Error("PREVIEW_EXPIRED: Змінився список конфліктів");
        const result = applyCuskinImport(items, rows, freshPlan, new Date().toISOString());
        counts = { created: result.created, enriched: result.enriched };
        if (!counts.created && !counts.enriched) throw new Error("Немає нових товарів або порожніх полів для доповнення");
        return result.products;
      });
    try {
      await appendActivity({
        event_type: "cuskin_import", entity_type: "product", entity_id: null,
        title: "Імпортовано асортимент CU SKIN",
        metadata: { created: counts.created, enriched: counts.enriched, sourceRows: rows.length,
          skipped: baselinePlan.filter(p=>p.kind === "skip").length,
          conflicts: baselinePlan.filter(p=>p.kind === "conflict").length },
      });
    } catch (error) { console.error("CU SKIN import saved; audit unavailable", error); }
    return response({
      ok: true, ...counts, skipped: baselinePlan.filter(p=>p.kind==="skip").length,
      conflicts: baselinePlan.filter(p=>p.kind==="conflict").map(p=>({sku:p.sku,reason:p.reason})),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося виконати імпорт";
    return response({ error: message.replace(/^PREVIEW_EXPIRED:\s*/, "") },
      message.startsWith("PREVIEW_EXPIRED:") ? 409 : 400);
  }
}
