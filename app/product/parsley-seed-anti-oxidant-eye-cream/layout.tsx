import type { Metadata } from "next";
import productImg from "@/assets/img/tovar1.webp";
import JsonLd from "@/components/JsonLd";
import { product } from "@/lib/product";
import { absoluteUrl, breadcrumbSchema, siteConfig } from "@/lib/seo";

const productUrl = absoluteUrl(`/product/${product.slug}`);
const imageUrl = absoluteUrl(productImg.src);

export const metadata: Metadata = {
  openGraph: {
    title: `${product.name} — купити в RESET Clinic`,
    description: product.description,
    url: productUrl,
    siteName: "RESET Clinic Shop",
    locale: siteConfig.locale,
    type: "website",
    images: [{ url: imageUrl, width: productImg.width, height: productImg.height, alt: product.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${product.name} — RESET Clinic`,
    description: product.description,
    images: [imageUrl],
  },
  robots: { index: true, follow: true },
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": `${productUrl}#product`,
  name: product.name,
  description: product.description,
  image: [imageUrl],
  url: productUrl,
  sku: product.slug,
  brand: {
    "@type": "Brand",
    name: "Aesop",
  },
  category: "Догляд за обличчям > Догляд за зоною навколо очей",
  additionalProperty: [
    { "@type": "PropertyValue", name: "Об’єм", value: product.size },
    { "@type": "PropertyValue", name: "Текстура", value: product.texture },
  ],
  offers: {
    "@type": "Offer",
    url: productUrl,
    priceCurrency: "UAH",
    price: product.price.toFixed(2),
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": `${siteConfig.url}/#organization` },
  },
};

const breadcrumbs = breadcrumbSchema([
  { name: "Головна", path: "/" },
  { name: "Обличчя", path: "/face" },
  { name: product.name, path: `/product/${product.slug}` },
]);

export default function ProductSeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[productSchema, breadcrumbs]} />
      {children}
    </>
  );
}
