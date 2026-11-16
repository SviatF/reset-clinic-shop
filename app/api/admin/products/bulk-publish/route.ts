import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { withVerifiedSourcePhotos, appendActivity } from "@/lib/commerce-json";
import type { ProductRecord } from "@/lib/commerce-types";
import { jsonStoreWriteConfigured, mutateJsonStore, readJsonStore, PRODUCTS_PATH } from "@/lib/json-store";
import { planCatalogPublishing, publishCatalogRows } from "@/lib/catalog-publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const result = (data: unknown, status = 200) => NextResponse.json(data, {
  status, headers: { "Cache-Control": "private, no-store" },
});
function validate(body: Record<string, unknown>): string[] {
  if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 500 ||
      body.ids.some(id => typeof id !== "string" || !id.length || id.length > 150))
    throw new Error("Оберіть від 1 до 500 товарів для публікації");
  const ids = body.ids as string[];
  if (new Set(ids).size !== ids.length) throw new Error("Повторені товари у списку");
  return ids;
}
function version(products: ProductRecord[], ids: string[]) {
  return createHash("sha256").update(JSON.stringify({ products, ids })).digest("hex");
}
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return result({ error: "Unauthorized" }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return result({ error: "Недозволене джерело запиту" }, 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.mode !== "preview" && body.mode !== "commit") throw new Error("Некоректний режим");
    const ids = validate(body);
    if (body.mode === "preview") {
      const data = (await readJsonStore<ProductRecord[]>(PRODUCTS_PATH, [])).data;
      const rows = planCatalogPublishing(data, withVerifiedSourcePhotos(data), ids);
      return result({ ok: true, rows, eligibleCount: rows.filter(r => r.eligible).length,
        skippedCount: rows.filter(r => !r.eligible).length,
        zeroStockCount: rows.filter(r => r.eligible && r.zeroStock).length,
        version: version(data,ids) });
    }
    if (!jsonStoreWriteConfigured()) return result({ error: "D1 недоступна для запису" }, 503);
    if (body.confirm !== true || typeof body.version !== "string" ||
        !/^[a-f0-9]{64}$/.test(body.version)) throw new Error("Спочатку перевірте товари й підтвердьте публікацію");
    const now = new Date().toISOString();
    let published = 0, withoutStock = 0, skipped = 0;
    await mutateJsonStore<ProductRecord[]>(PRODUCTS_PATH, [],
      "Admin: publish selected product drafts", data => {
      if (version(data,ids) !== body.version)
        throw new Error("STALE_PREVIEW: Каталог змінився. Перевірте товари знову.");
      const effective = withVerifiedSourcePhotos(data);
      const plan = planCatalogPublishing(data,effective,ids);
      const ready = plan.filter(row => row.eligible);
      if (!ready.length) throw new Error("Немає товарів із фото й коректною ціною для публікації");
      const applied = publishCatalogRows(data,effective,ids,now);
      published = applied.updatedCount;
      withoutStock = ready.filter(row => row.zeroStock).length;
      skipped = plan.length - published;
      return applied.products;
    });
    try {
      await appendActivity({
        event_type: "products_bulk_published", entity_type: "product", entity_id: null,
        title: "Опубліковано вибрані товари",
        metadata: { published, skipped, zeroStock: withoutStock },
      });
    } catch (error) { console.error("Bulk publish saved, activity log unavailable", error); }
    return result({ ok: true, published, skipped, zeroStock: withoutStock });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося опублікувати товари";
    return result({ error: message.replace(/^STALE_PREVIEW:\s*/, "") },
      message.startsWith("STALE_PREVIEW:") ? 409 : 400);
  }
}
