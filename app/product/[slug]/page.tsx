import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import productFallback from "@/assets/img/tovar1.webp";
import JsonLd from "@/components/JsonLd";
import ProductActions from "@/components/ProductActions";
import { absoluteUrl, breadcrumbSchema, siteConfig } from "@/lib/seo";
import { getStoreProductBySlug } from "@/lib/store-products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getStoreProductBySlug(slug);
  if (!item) return { title: "Товар не знайдено", robots: { index: false, follow: false } };
  const path = `/product/${item.slug}`;
  const image = item.imageUrl ? absoluteUrl(item.imageUrl) : absoluteUrl(productFallback.src);
  return {
    title: item.seoTitle || item.name,
    description: item.seoDescription || item.description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${item.name} — купити в RESET Clinic`,
      description: item.seoDescription || item.description,
      url: absoluteUrl(path),
      siteName: "RESET Clinic Shop",
      locale: siteConfig.locale,
      type: "website",
      images: [{ url: image, alt: item.name }],
    },
    twitter: { card: "summary_large_image", title: item.name, description: item.seoDescription || item.description, images: [image] },
  };
}

export default async function DynamicProductPage({ params }: Props) {
  const { slug } = await params;
  const item = await getStoreProductBySlug(slug);
  if (!item) notFound();
  const path = `/product/${item.slug}`;
  const imageSrc = item.imageUrl || productFallback.src;
  const categoryName = item.category === "body" ? "Тіло" : item.category === "hair" ? "Волосся" : item.category === "face" ? "Обличчя" : "Каталог";
  const categoryPath = item.category === "body" ? "/body" : item.category === "hair" ? "/hair" : item.category === "face" ? "/face" : "/catalog";
  const inStock = !item.trackStock || item.stockQuantity > 0;
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${absoluteUrl(path)}#product`,
    name: item.name,
    description: item.description,
    image: [absoluteUrl(imageSrc)],
    url: absoluteUrl(path),
    sku: item.slug,
    brand: { "@type": "Brand", name: item.brand },
    category: categoryName,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(path),
      priceCurrency: "UAH",
      price: Number(item.price).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${siteConfig.url}/#organization` },
    },
  };
  const breadcrumbs = breadcrumbSchema([
    { name: "Головна", path: "/" },
    { name: categoryName, path: categoryPath },
    { name: item.name, path },
  ]);

  return (
    <div className="product-page-conversion product-page-premium product-page-audit-v2 product-page-feminine">
      <JsonLd data={[productSchema, breadcrumbs]} />
      <section className="product-conversion-hero product-object-hero">
        <div className="shell">
          <div className="breadcrumbs"><Link href="/">Головна</Link><span>/</span><Link href={categoryPath}>{categoryName}</Link><span>/</span><span>{item.name}</span></div>
          <div className="product-conversion-layout product-object-layout">
            <div className="product-gallery-panel product-object-gallery">
              <div className="product-gallery-main product-object-stage">
                <span className="product-gallery-tag">RESET SELECT</span>
                <span className="product-object-index">01 / PRODUCT</span>
                <span className="product-object-halo" aria-hidden="true" />
                <img src={imageSrc} alt={item.name} className="dynamic-product-image" />
                <div className="product-object-footer"><span>{item.brand.toUpperCase()}</span><span>{item.size || "PRO CARE"}</span><span>RESET CLINIC</span></div>
              </div>
            </div>

            <div className="product-detail-panel product-premium-detail">
              <span className="eyebrow">{item.brand.toUpperCase()} · {categoryName.toUpperCase()}</span>
              <h1>{item.name}</h1>
              <p className="product-benefit-lead">{item.shortDescription || item.description}</p>

              <div className="product-purchase-deck product-purchase-deck-light">
                <div className="product-price-row product-price-card product-price-card-light">
                  <div className="product-price-main"><span className="product-price-label">ЦІНА</span><strong className="product-price-number">{Number(item.price).toFixed(2)} <em>грн</em></strong></div>
                  <div className="product-price-side"><span>RESET CLINIC</span><small>{inStock ? "Доступно до замовлення" : "Немає в наявності"}</small></div>
                </div>
                {inStock ? <ProductActions item={{ slug: item.slug, name: item.name, price: Number(item.price), maxQty: item.trackStock ? item.stockQuantity : 20 }} /> : <div className="checkout-payment-error">Товар тимчасово відсутній.</div>}
                <div className="product-shipping-line"><span>ДОСТАВКА</span><strong>Безкоштовно від 5000 грн</strong></div>
              </div>

              <div className="product-meta-strip">
                {item.size && <span><b>{item.size}</b> ОБ’ЄМ</span>}
                <span className="product-order-status"><i /> {inStock ? "ДОСТУПНО ДО ЗАМОВЛЕННЯ" : "НЕМАЄ В НАЯВНОСТІ"}</span>
                <span>{item.brand.toUpperCase()}</span>
              </div>

              {item.keyIngredients.length > 0 && <div className="product-quick-facts product-quick-facts-icons">
                {item.keyIngredients.slice(0, 3).map((ingredient, index) => <div key={ingredient}><span>0{index + 1}</span><strong>{ingredient}</strong></div>)}
              </div>}

              <div className="product-consult-inline-v2"><div><span>НЕ ВПЕВНЕНІ У ВИБОРІ?</span><strong>Перевіримо сумісність із вашим поточним доглядом.</strong></div><Link href="/consultation">Підібрати догляд →</Link></div>

              <div className="product-detail-disclosures">
                {item.howToUse && <details open><summary><span>Як застосовувати</span><b>+</b></summary><div className="product-disclosure-body"><p>{item.howToUse}</p></div></details>}
                {item.keyIngredients.length > 0 && <details open><summary><span>Ключові компоненти</span><b>+</b></summary><div className="product-disclosure-body"><p>{item.keyIngredients.join(" · ")}</p></div></details>}
                {item.inci && <details><summary><span>Повний склад · INCI</span><b>+</b></summary><div className="product-disclosure-body product-inci"><p>{item.inci}</p></div></details>}
              </div>

              <div className="product-assurance-grid product-assurance-premium">
                <div><b>ОРИГІНАЛЬНІСТЬ</b><span>Перевірені поставки.</span></div><div><b>ПІДБІР</b><span>Допомога косметолога.</span></div><div><b>ПІДТРИМКА</b><span>Після покупки.</span></div><div><b>ОТРИМАННЯ</b><span>Нова Пошта або самовивіз.</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
