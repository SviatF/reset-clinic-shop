import "server-only";

const OWNER = process.env.GITHUB_REPO_OWNER || "SviatF";
const REPO = process.env.GITHUB_REPO_NAME || "reset-clinic-shop";
const BRANCH = process.env.GITHUB_REPO_BRANCH || "main";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

export const PRODUCTS_PATH = "data/products.json";
export const ORDERS_PATH = "data/orders.json";
export const ACTIVITY_PATH = "data/activity.json";

type RepoFile<T> = { data: T; sha: string | null };

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

export async function readJsonStore<T>(path: string, fallback: T): Promise<RepoFile<T>> {
  const response = await fetch(`${API}/${path}?ref=${encodeURIComponent(BRANCH)}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (response.status === 404) return { data: fallback, sha: null };
  if (!response.ok) throw new Error(`JSON_STORE_READ_${response.status}: ${(await response.text()).slice(0, 300)}`);
  const body = await response.json() as { content?: string; encoding?: string; sha?: string };
  if (!body.content || body.encoding !== "base64") throw new Error("JSON_STORE_INVALID_CONTENT");
  const text = Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf8");
  return { data: JSON.parse(text) as T, sha: body.sha || null };
}

export async function writeJsonStore<T>(path: string, value: T, message: string, sha?: string | null) {
  const body: Record<string, unknown> = {
    message,
    branch: BRANCH,
    content: Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8").toString("base64"),
  };
  if (sha) body.sha = sha;
  const response = await fetch(`${API}/${path}`, {
    method: "PUT",
    headers: { ...headers(true), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`JSON_STORE_WRITE_${response.status}: ${(await response.text()).slice(0, 500)}`);
  return response.json();
}

export async function mutateJsonStore<T>(path: string, fallback: T, message: string, mutate: (current: T) => T | Promise<T>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const current = await readJsonStore(path, fallback);
      const next = await mutate(current.data);
      await writeJsonStore(path, next, message, current.sha);
      return next;
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || (!error.message.includes("409") && !error.message.includes("422"))) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("JSON_STORE_CONFLICT");
}

export async function writeBinaryToRepo(path: string, bytes: ArrayBuffer, message: string) {
  const response = await fetch(`${API}/${path}`, {
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
  return response.json();
}

export function jsonStoreWriteConfigured() {
  return Boolean(process.env.GITHUB_TOKEN);
}
