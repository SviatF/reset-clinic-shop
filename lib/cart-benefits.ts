import { isCertificateSlug } from "@/lib/certificate-products";

/** Shared benefit policy for cart, checkout and server-side order fulfilment. */
export const CART_BENEFITS = [
  { id: "shipping", threshold: 5000, label: "Безкоштовна доставка", toLabel: "безкоштовної доставки" },
  { id: "miniatures", threshold: 7000, label: "Мініатюри засобів у подарунок", toLabel: "мініатюр засобів у подарунок" },
  { id: "cosmetic-bag", threshold: 10000, label: "Косметичка у подарунок", toLabel: "косметички у подарунок" },
] as const;

/** Gift certificates are not cosmetic products and do not count towards these thresholds. */
export function physicalCartSubtotal(items: ReadonlyArray<{slug: string; price: number; qty: number}>): number {
  return items.reduce((sum, item) => sum + (isCertificateSlug(item.slug) ? 0 : item.price * item.qty), 0);
}

export function earnedCartBenefits(physicalSubtotal: number): string[] {
  return CART_BENEFITS.filter(benefit => physicalSubtotal >= benefit.threshold).map(benefit => benefit.label);
}
