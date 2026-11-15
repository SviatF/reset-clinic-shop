import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { cloudflareReadJson, cloudflareWriteJson, cloudflareMutateJson } from "@/lib/cloudflare-store";
import { shopMediaBucket,productMime } from "@/lib/r2-media";

const OWNER = process.env.GITHUB_REPO_OWNER || "SviatF";
const REPO = process.env.GITHUB_REPO_NAME || "reset-clinic-shop";
const BRANCH = process.env.GITHUB_REPO_BRANCH || "main-SASHA";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

export const PRODUCTS_PATH = "data/products.json";
export const CATEGORIES_PATH = "data/categories.json";
export const BRANDS_PATH = "data/brands.json";
export const ORDERS_PATH = "data/orders.json";
export const ACTIVITY_PATH = "data/activity.json";

type RepoFile<T> = { data: T; sha: string | null };

function localRoot() {
  const configured = process.env.SHOP_DATA_DIR?.trim();
  return configured ? path.resolve(configured) : null;
}

export function usingCloudflareStore() {
  return process.env.SHOP_STORAGE_BACKEND === "cloudflare";
}

function useD1ForPath(pathname: string) {
  if (!usingCloudflareStore()) return false;
  if (process.env.SHOP_PRODUCTS_BACKEND !== "d1")
    throw new Error("SHOP_D1_CUTOVER_INCOMPLETE: set SHOP_PRODUCTS_BACKEND=d1");
  return [PRODUCTS_PATH,CATEGORIES_PATH,BRANDS_PATH,ORDERS_PATH,ACTIVITY_PATH].includes(pathname);
}

export function usingLocalJsonStore() {
  return Boolean(localRoot());
}

function localRelative(pathname: string) {
  return pathname.replace(/^\/+/, "").replace(/^data\//, "").replace(/^public\//, "");
}

function localPath(pathname: string) {
  const root = localRoot();
  if (!root) throw new Error("SHOP_DATA_DIR is not configured");
  const resolved = path.resolve(root, localRelative(pathname));
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error("Invalid shop storage path");
  return resolved;
}

async function readLocalJson<T>(pathname: string, fallback: T): Promise<RepoFile<T>> {
  try {
    const text = await fs.readFile(localPath(pathname), "utf8");
    return { data: JSON.parse(text) as T, sha: null };
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return { data: fallback, sha: null };
    throw error;
  }
}

async function writeLocalJson<T>(pathname: string, value: T) {
  const destination = localPath(pathname);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, destination);
  return { local: true, path: destination };
}

function headers(write = false) {
  const value: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "RESET-Clinic-Shop",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) value.Authorization = `Bearer ${token}`;
  if (write && !token) throw new Error("GITHUB_TOKEN is not configured");
  return value;
}

export async function readJsonStore<T>(pathname: string, fallback: T): Promise<RepoFile<T>> {
  if (useD1ForPath(pathname)) return cloudflareReadJson(pathname, fallback);
  if (usingLocalJsonStore()) return readLocalJson(pathname, fallback);

  // An isolated staging Worker may be deployed before GitHub or D1 storage is
  // connected. Treat only known snapshot resources as read-only in that case.
  // Never guess data for an unknown path and never treat a failed authenticated
  // GitHub request as proof that orders/products do not exist.
  const snapshotPaths = new Set([PRODUCTS_PATH, CATEGORIES_PATH, BRANDS_PATH, ORDERS_PATH, ACTIVITY_PATH]);
  const canUseSnapshot = process.env.SHOP_STAGING === "true" && snapshotPaths.has(pathname);
  if (canUseSnapshot && !process.env.GITHUB_TOKEN) return { data: fallback, sha: null };

  try {
    const response = await fetch(`${API}/${pathname}?ref=${encodeURIComponent(BRANCH)}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (response.status === 404) {
      if (canUseSnapshot) {
        console.warn(`Staging GitHub document ${pathname} is inaccessible; using read-only bundled fallback`);
        return { data: fallback, sha: null };
      }
      throw new Error("GitHub не повернув дані сховища (404). Перевірте GITHUB_TOKEN, права доступу до приватного репозиторію та GITHUB_REPO_BRANCH.");
    }
    if (!response.ok) throw new Error(`JSON_STORE_READ_${response.status}`);
    const body = (await response.json()) as { content?: string; encoding?: string; sha?: string };
    if (!body.content || body.encoding !== "base64") throw new Error("JSON_STORE_INVALID_CONTENT");
    const text = Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf8");
    return { data: JSON.parse(text) as T, sha: body.sha || null };
  } catch (error) {
    // Fail visibly once persistent GitHub storage is explicitly configured,
    // rather than silently replacing real orders or edited products with seeds.
    throw error;
  }
}

export async function writeJsonStore<T>(pathname: string, value: T, message: string, sha?: string | null) {
  if (useD1ForPath(pathname)) return cloudflareWriteJson(pathname, value);
  if (usingLocalJsonStore()) return writeLocalJson(pathname, value);

  const body: Record<string, unknown> = {
    message,
    branch: BRANCH,
    content: Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8").toString("base64"),
  };
  if (sha) body.sha = sha;
  const response = await fetch(`${API}/${pathname}`, {
    method: "PUT",
    headers: { ...headers(true), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`JSON_STORE_WRITE_${response.status}: ${(await response.text()).slice(0, 500)}`);
  return response.json();
}

export async function mutateJsonStore<T>(pathname: string, fallback: T, message: string, mutate: (current: T) => T | Promise<T>) {
  if (useD1ForPath(pathname)) return cloudflareMutateJson(pathname, fallback, mutate);
  if (usingLocalJsonStore()) {
    const current = await readJsonStore(pathname, fallback);
    const next = await mutate(current.data);
    await writeJsonStore(pathname, next, message);
    return next;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const current = await readJsonStore(pathname, fallback);
      const next = await mutate(current.data);
      await writeJsonStore(pathname, next, message, current.sha);
      return next;
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || (!error.message.includes("409") && !error.message.includes("422"))) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("JSON_STORE_CONFLICT");
}

export async function writeBinaryAsset(relativePath: string, bytes: ArrayBuffer, message: string) {
  const clean = relativePath.replace(/^\/+/, "");
  if (usingCloudflareStore() || process.env.SHOP_MEDIA_BACKEND === "r2") {
    if (process.env.SHOP_MEDIA_BACKEND !== "r2")
      throw new Error("SHOP_R2_CUTOVER_INCOMPLETE: set SHOP_MEDIA_BACKEND=r2");
    const bucket = shopMediaBucket();
    if (!bucket) throw new Error("SHOP_R2_BINDING_MISSING");
    await bucket.put(clean, bytes, {httpMetadata:{contentType:productMime(clean)}});
    return `/shop-media/${clean}`;
  }
  if (usingLocalJsonStore()) {
    const destination = localPath(`uploads/${clean}`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(temporary, Buffer.from(bytes));
    await fs.rename(temporary, destination);
    return `/shop-media/${clean}`;
  }

  const repoPath = `public/uploads/${clean}`;
  const response = await fetch(`${API}/${repoPath}`, {
    method: "PUT",
    headers: { ...headers(true), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      branch: BRANCH,
      content: Buffer.from(bytes).toString("base64"),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`JSON_STORE_UPLOAD_${response.status}: ${(await response.text()).slice(0, 500)}`);
  return `/uploads/${clean}`;
}

export async function readLocalBinaryAsset(relativePath: string) {
  if (!usingLocalJsonStore()) return null;
  try {
    return await fs.readFile(localPath(`uploads/${relativePath.replace(/^\/+/, "")}`));
  } catch {
    return null;
  }
}

export function jsonStoreWriteConfigured() {
  if (usingCloudflareStore()) return process.env.SHOP_PRODUCTS_BACKEND === "d1";
  return usingLocalJsonStore() || Boolean(process.env.GITHUB_TOKEN);
}

/** Diagnostic used by the admin UI; read-only storage must not be mistaken
 * for a working editor. A GitHub repo without a permissions object can still
 * accept writes, so absence of that optional field is not a read-only verdict. */
export type ShopWriteStatus = {
  writable: boolean;
  backend: "cloudflare-d1" | "local" | "github";
  reason: string | null;
};
export async function jsonStoreWriteStatus(): Promise<ShopWriteStatus> {
  if (usingCloudflareStore()) {
    if (process.env.SHOP_PRODUCTS_BACKEND !== "d1")
      return { writable: false, backend: "cloudflare-d1", reason: "Cloudflare: SHOP_PRODUCTS_BACKEND має бути d1." };
    try {
      await cloudflareReadJson(PRODUCTS_PATH, []);
      return { writable: true, backend: "cloudflare-d1", reason: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "невідома помилка";
      return { writable: false, backend: "cloudflare-d1", reason: "Немає доступу до каталогу Cloudflare D1. Перевірте SHOP_DB і таблицю shop_documents. " + message };
    }
  }
  if (usingLocalJsonStore()) return { writable: true, backend: "local", reason: null };
  if (!process.env.GITHUB_TOKEN)
    return { writable: false, backend: "github", reason: "Сховище товарів тільки для перегляду: не налаштовано Cloudflare D1 або серверний GITHUB_TOKEN. Потрібно підключити сховище на хостингу магазину." };
  try {
    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, { headers: headers(), cache: "no-store" });
    if (!response.ok) return { writable: false, backend: "github", reason: `GitHub API недоступний (${response.status}). Перевірте права GITHUB_TOKEN.` };
    const repository = (await response.json()) as { permissions?: { push?: boolean } };
    if (repository.permissions?.push === false)
      return { writable: false, backend: "github", reason: "GitHub-токен має доступ на читання, але не дозволяє змінювати товари." };
    await readJsonStore(PRODUCTS_PATH, []);
    // Read access + configured token are sufficient to permit an attempt. The
    // actual write is still validated atomically by GitHub/D1 before success.
    return { writable: true, backend: "github", reason: null };
  } catch (error) {
    return { writable: false, backend: "github", reason: "Не вдалося перевірити сховище товарів: " + (error instanceof Error ? error.message : String(error)) };
  }
}

export async function jsonStoreWriteAvailable() {
  return (await jsonStoreWriteStatus()).writable;
}
