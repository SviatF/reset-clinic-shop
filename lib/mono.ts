import "server-only";

import { createPublicKey, verify } from "node:crypto";
import { product } from "@/lib/product";

const MONO_API = "https://api.monobank.ua";
export const SITE_URL = process.env.SITE_URL || "https://reset-clinic-shop.vercel.app";

export type CheckoutCartItem = {
  slug: string;
  qty: number;
};

export type MonoInvoiceStatus = {
  invoiceId: string;
  status: "created" | "processing" | "hold" | "success" | "failure" | "reversed" | "expired";
  amount: number;
  finalAmount?: number;
  ccy: number;
  reference?: string;
  destination?: string;
  failureReason?: string;
  errCode?: string;
  modifiedDate?: string;
  paymentInfo?: {
    maskedPan?: string;
    paymentSystem?: string;
    paymentMethod?: string;
  };
};

function token() {
  const value = process.env.MONOPAY_TOKEN;
  if (!value) throw new Error("MONOPAY_TOKEN is not configured");
  return value;
}

export async function monoFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("X-Token", token());
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  return fetch(`${MONO_API}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export function normalizeOrder(items: CheckoutCartItem[]) {
  if (!Array.isArray(items) || !items.length) throw new Error("Кошик порожній");

  const normalized = items.map((item) => {
    if (item.slug !== product.slug) throw new Error("У кошику є невідомий товар");
    const qty = Math.max(1, Math.min(20, Math.trunc(Number(item.qty) || 1)));
    const unitAmount = Math.round(product.price * 100);
    return {
      slug: product.slug,
      name: product.name,
      qty,
      unitAmount,
      totalAmount: unitAmount * qty,
    };
  });

  return {
    items: normalized,
    amount: normalized.reduce((sum, item) => sum + item.totalAmount, 0),
  };
}

let cachedPublicKey: ReturnType<typeof createPublicKey> | null = null;

async function fetchWebhookPublicKey(force = false) {
  if (cachedPublicKey && !force) return cachedPublicKey;

  const response = await monoFetch("/api/merchant/pubkey");
  if (!response.ok) throw new Error(`mono pubkey request failed: ${response.status}`);
  const data = (await response.json()) as { key?: string };
  if (!data.key) throw new Error("mono pubkey missing");

  const decoded = Buffer.from(data.key, "base64");
  const utf8 = decoded.toString("utf8");
  cachedPublicKey = createPublicKey(utf8.includes("BEGIN PUBLIC KEY") ? utf8 : decoded);
  return cachedPublicKey;
}

async function verifyWithKey(rawBody: string, signatureBase64: string, forceRefresh = false) {
  const key = await fetchWebhookPublicKey(forceRefresh);
  const signature = Buffer.from(signatureBase64, "base64");
  return verify("sha256", Buffer.from(rawBody, "utf8"), key, signature);
}

export async function verifyMonoWebhook(rawBody: string, signatureBase64: string) {
  if (!signatureBase64) return false;
  try {
    if (await verifyWithKey(rawBody, signatureBase64, false)) return true;
    return await verifyWithKey(rawBody, signatureBase64, true);
  } catch {
    return false;
  }
}
