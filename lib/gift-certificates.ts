/**
 * Shop certificates are for online-store purchases; clinic certificates are for
 * procedures provided in person. These purposes are not delivery formats.
 */
export const CERTIFICATE_DENOMINATIONS = [1000, 2000, 3000, 5000] as const;
export type CertificatePurpose = "shop" | "clinic";

export function certificateSlug(amount: number, purpose: CertificatePurpose) {
  return "gift-certificate-" + amount + "-" + purpose;
}

export function parseCertificateSlug(slug: string): { amount: number; purpose: CertificatePurpose } | null {
  const match = /^gift-certificate-(\d+)-(shop|clinic)$/.exec(slug);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!(CERTIFICATE_DENOMINATIONS as readonly number[]).includes(amount)) return null;
  return { amount, purpose: match[2] as CertificatePurpose };
}

export function isCertificateSlug(slug: string) {
  return /^gift-certificate-/.test(slug);
}

export function certificateName(amount: number, purpose: CertificatePurpose) {
  return "Подарунковий сертифікат RESET Clinic · " +
    (purpose === "shop" ? "На покупки в інтернет-магазині" : "На процедури в клініці") +
    " · " + amount.toLocaleString("uk-UA") + " грн";
}

export function cartProductUrl(slug: string) {
  return isCertificateSlug(slug) ? "/certificate" : "/product/" + slug;
}
