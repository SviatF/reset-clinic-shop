/** One universal RESET Clinic gift certificate, valid for cosmetics and clinic procedures. */
export const CERTIFICATE_DENOMINATIONS = [1500, 2000, 3000, 5000, 10000, 15000, 20000] as const;
const PREFIX = "reset-gift-certificate";

/** One SKU per amount. Browser values never determine the price charged. */
export function certificateSlug(amount: number): string {
  return `${PREFIX}-${amount}`;
}

export function certificateFromSlug(slug: string) {
  const match = /^reset-gift-certificate-(1500|2000|3000|5000|10000|15000|20000)$/.exec(slug);
  if (!match) return null;
  const amount = Number(match[1]);
  return {
    slug,
    amount,
    price: amount,
    name: `Універсальний подарунковий сертифікат RESET Clinic — ${amount.toLocaleString("uk-UA")} грн`,
    sku: `RESET-GIFT-${amount}`,
    productId: `certificate_${amount}`,
  };
}

/** Historical variants stay recognizable in saved carts and orders but cannot be paid again. */
export function isLegacyCertificateSlug(slug: string): boolean {
  return /^reset-gift-certificate-(?:(?:shop|clinic)-)?(?:1000|2000|3000|5000)-(?:online|offline)$/.test(slug);
}

export function isCertificateSlug(slug: string): boolean {
  return certificateFromSlug(slug) !== null || isLegacyCertificateSlug(slug);
}

export function cartItemHref(slug: string): string {
  return isCertificateSlug(slug) ? "/certificate#certificate-order" : `/product/${slug}`;
}
