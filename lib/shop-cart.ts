export const RESET_CART_STORAGE_KEY = "reset-shop-cart-v1";
export const RESET_CART_EVENT = "resetshop:cart-change";

export type ResetCartItem = {
  key: string;
  productId: string;
  variationId?: string;
  sku?: string;
  name: string;
  href?: string;
  image?: string;
  price: number;
  priceText: string;
  quantity: number;
  attributes?: Record<string, string>;
};

export function parsePriceText(value: string | null | undefined) {
  if (!value) return 0;
  const normalized = value
    .replace(/\u00a0/g, " ")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,(?=\d{1,2}(?:\D|$))/g, ".")
    .replace(/,/g, "");
  const matches = normalized.match(/-?\d+(?:\.\d+)?/g);
  if (!matches?.length) return 0;
  const parsed = Number(matches[matches.length - 1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatUah(value: number) {
  try {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency: "UAH",
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(Number.isInteger(value) ? 0 : 2)} ₴`;
  }
}

export function cartItemKey(productId: string, variationId?: string, attributes?: Record<string, string>) {
  const attrKey = attributes
    ? Object.entries(attributes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => `${name}:${value}`)
        .join("|")
    : "";
  return [productId, variationId ?? "", attrKey].join("::");
}

export function sanitizeQuantity(value: unknown, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(99, Math.round(parsed)));
}

export function readCartFromStorage(): ResetCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RESET_CART_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object" && item.productId && item.name)
      .map((item) => ({
        ...item,
        key: String(item.key || cartItemKey(String(item.productId), item.variationId, item.attributes)),
        productId: String(item.productId),
        variationId: item.variationId ? String(item.variationId) : undefined,
        name: String(item.name),
        price: Number.isFinite(Number(item.price)) ? Number(item.price) : 0,
        priceText: String(item.priceText ?? ""),
        quantity: sanitizeQuantity(item.quantity),
      })) as ResetCartItem[];
  } catch {
    return [];
  }
}

export function writeCartToStorage(items: ResetCartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RESET_CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(RESET_CART_EVENT, { detail: items }));
}

export function addCartItem(item: ResetCartItem) {
  const items = readCartFromStorage();
  const existing = items.find((candidate) => candidate.key === item.key);
  if (existing) existing.quantity = sanitizeQuantity(existing.quantity + item.quantity);
  else items.push({ ...item, quantity: sanitizeQuantity(item.quantity) });
  writeCartToStorage(items);
  return items;
}

export function updateCartItemQuantity(key: string, quantity: number) {
  const items = readCartFromStorage();
  const item = items.find((candidate) => candidate.key === key);
  if (!item) return items;
  item.quantity = sanitizeQuantity(quantity);
  writeCartToStorage(items);
  return items;
}

export function removeCartItem(key: string) {
  const items = readCartFromStorage().filter((candidate) => candidate.key !== key);
  writeCartToStorage(items);
  return items;
}

export function clearCart() {
  writeCartToStorage([]);
}

export function cartQuantity(items: ResetCartItem[]) {
  return items.reduce((sum, item) => sum + sanitizeQuantity(item.quantity), 0);
}

export function cartSubtotal(items: ResetCartItem[]) {
  return items.reduce((sum, item) => sum + item.price * sanitizeQuantity(item.quantity), 0);
}
