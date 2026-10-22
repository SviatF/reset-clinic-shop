/**
 * Gift certificate denominations are managed here in one place.
 * The server validates all certificate line-item prices against these values.
 */
export const CERTIFICATE_AMOUNTS = [1000, 2000, 3000, 5000] as const;

export type CertificateFormat = "digital" | "physical";

export function certificateSlug(amount: number, format: CertificateFormat): string {
  return `gift-certificate-${amount}-${format}`;
}

export function parseCertificateSlug(slug: string): { amount: number; format: CertificateFormat } | null {
  const match = /^gift-certificate-(\d+)-(digital|physical)$/.exec(slug);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!(CERTIFICATE_AMOUNTS as readonly number[]).includes(amount)) return null;
  return { amount, format: match[2] as CertificateFormat };
}

export function isCertificateSlug(slug: string): boolean {
  return slug.startsWith("gift-certificate-");
}

export function certificateTitle(amount: number, format: CertificateFormat): string {
  const label = format === "digital" ? "Онлайн" : "Офлайн";
  return `Подарунковий сертифікат RESET Clinic · ${amount.toLocaleString("uk-UA")} ₴ · ${label}`;
}

export function cartItemUrl(slug: string): string {
  return isCertificateSlug(slug) ? "/certificate" : `/product/${slug}`;
}
