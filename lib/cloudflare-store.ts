import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type Database = {
  prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; run(): Promise<{ meta?: { changes?: number } }> } };
};
type Bindings = { SHOP_DB: Database };

function bindings(): Bindings {
  const env = getCloudflareContext().env as unknown as Partial<Bindings>;
  if (!env.SHOP_DB) throw new Error("Cloudflare SHOP_DB binding missing");
  return env as Bindings;
}
function key(path: string) { return path.replace(/^\/+/, ""); }

export async function cloudflareReadJson<T>(pathname: string, fallback: T) {
  const { SHOP_DB } = bindings();
  const row = await SHOP_DB.prepare("SELECT content, version FROM shop_documents WHERE pathname = ?")
    .bind(key(pathname)).first<{ content: string; version: number }>();
  return { data: row ? JSON.parse(row.content) as T : fallback, sha: row ? String(row.version) : null };
}
export async function cloudflareWriteJson<T>(pathname: string, value: T) {
  const { SHOP_DB } = bindings();
  await SHOP_DB.prepare("INSERT INTO shop_documents (pathname, content, version, updated_at) VALUES (?, ?, 1, datetime('now')) ON CONFLICT(pathname) DO UPDATE SET content = excluded.content, version = shop_documents.version + 1, updated_at = excluded.updated_at")
    .bind(key(pathname), JSON.stringify(value)).run();
  return { cloudflare: true };
}
export async function cloudflareMutateJson<T>(pathname: string, fallback: T, mutate: (current: T) => T | Promise<T>) {
  const { SHOP_DB } = bindings();
  for (let i = 0; i < 6; i++) {
    const current = await cloudflareReadJson(pathname, fallback);
    const next = await mutate(current.data);
    const result = current.sha
      ? await SHOP_DB.prepare("UPDATE shop_documents SET content = ?, version = version + 1, updated_at = datetime('now') WHERE pathname = ? AND version = ?")
        .bind(JSON.stringify(next), key(pathname), Number(current.sha)).run()
      : await SHOP_DB.prepare("INSERT OR IGNORE INTO shop_documents (pathname, content, version, updated_at) VALUES (?, ?, 1, datetime('now'))")
        .bind(key(pathname), JSON.stringify(next)).run();
    if ((result.meta?.changes ?? 0) > 0) return next;
  }
  throw new Error("SHOP_D1_CONCURRENT_UPDATE_RETRY_EXHAUSTED");
}
