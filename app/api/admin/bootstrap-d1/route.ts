import { createHash } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import productData from "@/data/products.json";
import categoryData from "@/data/categories.json";
import brandData from "@/data/brands.json";
import ordersData from "@/data/orders.json";
import activityData from "@/data/activity.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SqlResult = { success?: boolean; meta?: { changes?: number } };
type Statement = {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<SqlResult>;
};
type Database = {
  prepare(query: string): Statement;
  batch(statements: Statement[]): Promise<SqlResult[]>;
};
type Document = { pathname: string; content: string; records: number; sha256: string };
type ExistingDocument = { pathname: string; records: number };
const JSON_SOURCES = [
  ["products", productData],
  ["categories", categoryData],
  ["brands", brandData],
  ["orders", ordersData],
  ["activity", activityData],
] as const;

function expectedDocuments(): Document[] {
  const documents: Document[] = JSON_SOURCES.map(([name, data]) => {
    if (!Array.isArray(data)) throw new Error("INVALID_SEED_DOCUMENT_" + name);
    const content = JSON.stringify(data);
    if (Buffer.byteLength(content, "utf8") >= 1900000) throw new Error("SEED_DOCUMENT_TOO_LARGE_" + name);
    return {
      pathname: "data/" + name + ".json",
      content,
      records: data.length,
      sha256: createHash("sha256").update(content).digest("hex"),
    };
  });
  if (documents.length !== 5 || documents[0].records !== 279 || documents[1].records !== 16 ||
      documents[2].records !== 10 || documents[3].records !== 0 || documents[4].records !== 0) {
    throw new Error("UNEXPECTED_SEED_COUNTS");
  }
  const products = productData as Array<{ id: string; slug: string }>;
  if (new Set(products.map(p => p.slug)).size !== products.length ||
      new Set(products.map(p => p.id)).size !== products.length) {
    throw new Error("DUPLICATE_PRODUCT_IDENTIFIERS");
  }
  return documents;
}
function db(): Database {
  const env = getCloudflareContext().env as unknown as { SHOP_DB?: Database };
  if (!env.SHOP_DB) throw new Error("SHOP_DB_BINDING_MISSING");
  return env.SHOP_DB;
}
async function existingDocuments(database: Database): Promise<ExistingDocument[]> {
  const response = await database.prepare(
    "SELECT pathname, json_array_length(content) AS records FROM shop_documents ORDER BY pathname",
  ).all<ExistingDocument>();
  return response.results;
}
function isSeeded(rows: ExistingDocument[], expected: Document[]) {
  return rows.length === expected.length &&
    expected.every(doc => rows.some(row => row.pathname === doc.pathname && row.records === doc.records));
}
async function checkExactContent(database: Database, expected: Document[]) {
  for (const doc of expected) {
    const row = await database.prepare("SELECT content FROM shop_documents WHERE pathname = ?")
      .bind(doc.pathname).first<{ content: string }>();
    if (!row || createHash("sha256").update(row.content).digest("hex") !== doc.sha256) return false;
  }
  return true;
}
function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}
async function state() {
  const database = db();
  const expected = expectedDocuments();
  const rows = await existingDocuments(database);
  return { database, expected, rows };
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return noStore({ error: "Unauthorized" }, 401);
  try {
    const { database, expected, rows } = await state();
    const exact = isSeeded(rows, expected) && await checkExactContent(database, expected);
    return noStore({
      ok: true,
      staging: process.env.SHOP_STAGING === "true",
      empty: rows.length === 0,
      initialized: exact,
      blocked: rows.length > 0 && !exact,
      expected: expected.map(({ pathname, records }) => ({ pathname, records })),
      persisted: rows,
      activeStorage: process.env.SHOP_STORAGE_BACKEND === "cloudflare" &&
        process.env.SHOP_PRODUCTS_BACKEND === "d1",
    });
  } catch (error) {
    console.error("D1 bootstrap status failed", error);
    return noStore({ error: "D1 недоступна або таблиця shop_documents не створена. Перевір SHOP_DB і D1 Console." }, 503);
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return noStore({ error: "Unauthorized" }, 401);
  if (process.env.SHOP_STAGING !== "true") return noStore({ error: "Ініціалізація дозволена лише в staging." }, 409);
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin || requestOrigin !== new URL(request.url).origin) {
    return noStore({ error: "Invalid request origin" }, 403);
  }
  let input: { confirmation?: string };
  try { input = await request.json() as { confirmation?: string }; }
  catch { return noStore({ error: "Invalid JSON body" }, 400); }
  if (input.confirmation !== "CREATE_NEW_D1_279") return noStore({ error: "Потрібне підтвердження створення нової бази." }, 400);
  try {
    const { database, expected, rows } = await state();
    if (rows.length > 0) {
      const exact = isSeeded(rows, expected) && await checkExactContent(database, expected);
      return noStore({
        ok: exact, initialized: exact, created: false,
        message: exact
          ? "Початкові документи вже існують, повторного запису не виконано."
          : "У D1 вже є дані. Ініціалізацію заблоковано, щоб їх не перезаписати.",
        persisted: rows,
      }, exact ? 200 : 409);
    }
    // D1 batch is atomic. INSERT OR IGNORE avoids overwriting any document even
    // if this endpoint is invoked concurrently; only an empty D1 is seeded.
    const statements = expected.map(doc => database.prepare(
      "INSERT OR IGNORE INTO shop_documents(pathname,content,version,updated_at) VALUES (?,?,1,datetime('now'))",
    ).bind(doc.pathname, doc.content));
    const results = await database.batch(statements);
    if (results.some(result => result.success === false)) throw new Error("D1_BATCH_FAILED");
    const verifiedRows = await existingDocuments(database);
    const exact = isSeeded(verifiedRows, expected) && await checkExactContent(database, expected);
    if (!exact) throw new Error("D1_BOOTSTRAP_VERIFICATION_FAILED");
    return noStore({
      ok: true, initialized: true, created: true,
      records: expected.map(({ pathname, records }) => ({ pathname, records })),
      activeStorage: process.env.SHOP_STORAGE_BACKEND === "cloudflare" &&
        process.env.SHOP_PRODUCTS_BACKEND === "d1",
      message: "Початкові документи створено й перевірено. Дані GitHub-каталогу імпортовано в D1.",
    });
  } catch (error) {
    console.error("D1 bootstrap failed", error);
    return noStore({ error: "Ініціалізація D1 не завершена. Перевір Cloudflare Worker Logs і стан бази перед повторною спробою." }, 503);
  }
}
