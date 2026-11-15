/** Single source of truth for regular, promotional and payable product prices.
 * Promotions are optional. Persist only sale_price; the badge percentage is
 * derived from the regular price to avoid contradictory promotion values. */
export type PriceInput = { price: number | string; sale_price?: number | string | null };

const money = (value: number) => Math.round(value * 100) / 100;

export function getProductPricing(product: PriceInput) {
  const rawRegular = Number(product.price);
  const originalPrice = Number.isFinite(rawRegular) ? money(rawRegular) : 0;
  const rawSale = product.sale_price == null || product.sale_price === "" ? null : Number(product.sale_price);
  const onSale = originalPrice > 0 && rawSale !== null && Number.isFinite(rawSale)
    && money(rawSale) > 0 && money(rawSale) < originalPrice;
  const price = onSale ? money(rawSale) : originalPrice;
  const discountPercent = onSale ? Number(((1 - price / originalPrice) * 100).toFixed(1)) : 0;
  return { price, originalPrice, discountPercent, onSale };
}

/** Reject malformed or misleading promotions; null disables a promotion. */
export function validateSalePrice(regular: unknown, candidate: unknown): number | null {
  if (candidate === null || candidate === undefined || candidate === "") return null;
  if (typeof candidate !== "number" && typeof candidate !== "string")
    throw new Error("Некоректна акційна ціна");
  const base = Number(regular);
  const sale = Number(candidate);
  if (!Number.isFinite(base) || !Number.isFinite(sale) || base <= 0 ||
      sale <= 0 || sale >= base || Math.abs(sale * 100 - Math.round(sale * 100)) > 0.000001)
    throw new Error("Акційна ціна має бути більшою за 0, меншою за звичайну ціну та містити не більше 2 знаків після коми");
  return money(sale);
}
