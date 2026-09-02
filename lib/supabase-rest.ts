import "server-only";

function getConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return { url, key };
}

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function supabaseRest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = getConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SUPABASE_${response.status}: ${text.slice(0, 600)}`);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function dbSelect<T>(table: string, query = "select=*") {
  return supabaseRest<T[]>(`${table}?${query}`);
}

export async function dbInsert<T>(table: string, value: unknown) {
  const rows = await supabaseRest<T[]>(table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(value),
  });
  return rows?.[0];
}

export async function dbUpdate<T>(table: string, filter: string, value: unknown) {
  return supabaseRest<T[]>(`${table}?${filter}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(value),
  });
}

export async function dbDelete(table: string, filter: string) {
  return supabaseRest(`${table}?${filter}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function uploadProductImage(file: File, objectPath: string) {
  const { url, key } = getConfig();
  const response = await fetch(`${url}/storage/v1/object/product-images/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });

  if (!response.ok) throw new Error(`UPLOAD_${response.status}: ${(await response.text()).slice(0, 400)}`);
  return `${url}/storage/v1/object/public/product-images/${objectPath}`;
}
