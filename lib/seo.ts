export const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://reset-clinic-shop.vercel.app").replace(/\/$/, "");

export const siteConfig = {
  name: "RESET Clinic",
  legalName: "RESET Clinic",
  url: SITE_URL,
  locale: "uk_UA",
  language: "uk-UA",
  phone: "+380932828888",
  email: "reset.clinic.lviv@gmail.com",
  address: {
    streetAddress: "вул. Кульпарківська, 93/2",
    addressLocality: "Львів",
    addressCountry: "UA",
  },
  description:
    "Інтернет-магазин професійної косметики RESET Clinic у Львові: догляд за обличчям, тілом і волоссям, підбір косметолога, оригінальна продукція та доставка по Україні.",
};

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: siteConfig.name,
  legalName: siteConfig.legalName,
  url: SITE_URL,
  email: siteConfig.email,
  telephone: siteConfig.phone,
  address: {
    "@type": "PostalAddress",
    ...siteConfig.address,
  },
};

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "HealthAndBeautyBusiness",
  "@id": `${SITE_URL}/#localbusiness`,
  name: siteConfig.name,
  url: SITE_URL,
  telephone: siteConfig.phone,
  email: siteConfig.email,
  address: {
    "@type": "PostalAddress",
    ...siteConfig.address,
  },
  areaServed: {
    "@type": "Country",
    name: "Ukraine",
  },
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: `${siteConfig.name} Shop`,
  inLanguage: siteConfig.language,
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function collectionSchema({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    inLanguage: siteConfig.language,
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };
}
