import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

const OWNER = process.env.GITHUB_REPO_OWNER || "SviatF";
const REPO = process.env.GITHUB_REPO_NAME || "reset-clinic-shop";
const BRANCH = process.env.GITHUB_REPO_BRANCH || "main";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

export const PRODUCTS_PATH = "data/products.json";
export const ORDERS_PATH = "data/orders.json";
export const ACTIVITY_PATH = "data/activity.json";

type RepoFile<T> = { data: T; sha: string | null };

function localRoot() {
  const configured = process.env.SHOP_DATA_DIR?.trim();
  return configured ? path.resolve(configured) : null;
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
  if (usingLocalJsonStore()) return readLocalJson(pathname, fallback);

  const response = await fetch(`${API}/${pathname}?ref=${encodeURIComponent(BRANCH)}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (response.status === 404) return { data: fallback, sha: null };
  if (!response.ok) throw new Error(`JSON_STORE_READ_${response.status}: ${(await response.text()).slice(0, 300)}`);
  const body = (await response.json()) as { content?: string; encoding?: string; sha?: string };
  if (!body.content || body.encoding !== "base64") throw new Error("JSON_STORE_INVALID_CONTENT");
  const text = Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf8");
  return { data: JSON.parse(text) as T, sha: body.sha || null };
}

export async function writeJsonStore<T>(pathname: string, value: T, message: string, sha?: string | null) {
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
  return usingLocalJsonStore() || Boolean(process.env.GITHUB_TOKEN);
}
