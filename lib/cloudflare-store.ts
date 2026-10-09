import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type Database = {
  prepare(sql: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null>; run(): Promise<{ meta?: { changes?: number } }> } };
};
type Bucket = {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType: string } }): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
};
type Bindings = { SHOP_DB: Database; SHOP_MEDIA: Bucket };

function bindings(): Bindings {
  const env = getCloudflareContext().env as unknown as Partial<Bindings>;
  if (!env.SHOP_DB || !env.SHOP_MEDIA) throw new Error("Cloudflare SHOP_DB / SHOP_MEDIA bindings missing");
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
export async function cloudflareWriteBinary(relativePath: string, bytes: ArrayBuffer) {
  const { SHOP_MEDIA } = bindings();
  const clean = key(relativePath);
  if (clean.includes("..")) throw new Error("Invalid asset path");
  const ext = clean.split(".").pop()?.toLowerCase();
  const mime: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };
  await SHOP_MEDIA.put("uploads/" + clean, bytes, { httpMetadata: { contentType: mime[ext || ""] || "application/octet-stream" } });
  return "/shop-media/" + clean;
}
export async function cloudflareReadBinary(relativePath: string): Promise<Uint8Array | null> {
  const clean = key(relativePath);
  if (clean.includes("..")) return null;
  const object = await bindings().SHOP_MEDIA.get("uploads/" + clean);
  return object ? new Uint8Array(await object.arrayBuffer()) : null;
}
