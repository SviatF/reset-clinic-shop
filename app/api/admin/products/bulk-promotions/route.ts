import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { appendActivity } from "@/lib/commerce-json";
import type { ProductRecord } from "@/lib/commerce-types";
import { productSubcategories } from "@/lib/catalog-taxonomy";
import { jsonStoreWriteConfigured, mutateJsonStore, PRODUCTS_PATH, readJsonStore } from "@/lib/json-store";
import {
  normalizeBulkPromotionInput,
  buildBulkPromotionPlan,
  promotionSnapshot,
  applyBulkPromotionPlan,
} from "@/lib/bulk-promotions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

function withResolvedSubcategories(products: ProductRecord[]) {
  // Older catalog rows may have inferred category assignments.
  // Resolve for filtering only, not for writing back to D1.
  return products.map(p => ({
    ...p,
    subcategory_slugs: productSubcategories(p),
  }));
}
function revision(products: ProductRecord[], input: ReturnType<typeof normalizeBulkPromotionInput>) {
  return createHash("sha256").update(promotionSnapshot(withResolvedSubcategories(products), input)).digest("hex");
}

/** Preview + commit use the exact same server-side filtering and calculations.
 * Client can exclude previewed eligible IDs; cannot add arbitrary products.
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return reply({ error: "Unauthorized" }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply({ error: "Недозволене джерело запиту" }, 403);
  try {
    const raw = await request.json() as Record<string, unknown>;
    const mode = raw?.mode;
    if (mode !== "preview" && mode !== "apply") throw new Error("Некоректна дія");
    const input = normalizeBulkPromotionInput(raw);
    if (mode === "preview") {
      const { data } = await readJsonStore<ProductRecord[]>(PRODUCTS_PATH, []);
      const products = withResolvedSubcategories(data);
      const plan = buildBulkPromotionPlan(products, input);
      return reply({
        ok: true,
        preview: true,
        token: revision(data, input),
        rows: plan.rows,
        matchedCount: plan.matchedCount,
        eligibleCount: plan.eligibleCount,
        skippedCount: plan.skippedCount,
      });
    }

    if (!jsonStoreWriteConfigured())
      return reply({ error: "Сховище D1 недоступне для запису" }, 503);
    if (typeof raw.token !== "string" || !/^[0-9a-f]{64}$/.test(raw.token))
      throw new Error("Спочатку перевірте товари у попередньому перегляді");
    if (!Array.isArray(raw.excludedIds) || raw.excludedIds.length > 500 ||
        raw.excludedIds.some(v => typeof v !== "string" || v.length > 150))
      throw new Error("Некоректний список виключених товарів");
    const excluded = raw.excludedIds as string[];
    if (new Set(excluded).size !== excluded.length) throw new Error("Повторні ID у виборі товарів");

    let count = 0;
    let matched = 0;
    let skipped = 0;
    const now = new Date().toISOString();
    await mutateJsonStore<ProductRecord[]>(
      PRODUCTS_PATH,
      [],
      "Admin: mass product discount " + input.action,
      rawProducts => {
        // Work on the raw D1 document, not mutateProducts(): preserve the legacy
        // hidden test row and every nonmatching product exactly as stored.
        const resolved = withResolvedSubcategories(rawProducts);
        if (revision(rawProducts, input) !== raw.token)
          throw new Error("PREVIEW_EXPIRED: Каталог або ціни змінилися. Оновіть попередній перегляд перед застосуванням.");
        const plan = buildBulkPromotionPlan(resolved, input);
        const allowed = new Set(plan.rows.filter(row => row.eligible).map(row => row.id));
        if (excluded.some(id => !allowed.has(id)))
          throw new Error("Список вибраних товарів змінився. Повторіть попередній перегляд.");
        const updated = applyBulkPromotionPlan(rawProducts, plan, excluded, now);
        if (!updated.updatedCount) throw new Error("Немає товарів для зміни");
        count = updated.updatedCount;
        matched = plan.matchedCount;
        skipped = plan.skippedCount + excluded.length;
        return updated.products;
      },
    );
    try {
      await appendActivity({
        event_type: "bulk_promotion",
        entity_type: "product",
        entity_id: null,
        title: input.action === "apply" ? "Масову знижку застосовано" : "Масові знижки скасовано",
        metadata: {
          action: input.action,
          percent: input.action === "apply" ? input.percent : null,
          filters: input.filters,
          overwriteExisting: input.overwriteExisting,
          updatedCount: count,
          matchedCount: matched,
          skippedCount: skipped,
        },
      });
    } catch (error) {
      console.error("Bulk promotion saved, activity log unavailable", error);
    }
    return reply({ ok: true, updatedCount: count, matchedCount: matched, skippedCount: skipped });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося змінити акції";
    return reply({ error: message.replace(/^PREVIEW_EXPIRED:\s*/, "") },
      message.startsWith("PREVIEW_EXPIRED:") ? 409 : 400);
  }
}
