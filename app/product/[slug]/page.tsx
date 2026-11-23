import { getInventoryState } from "@/lib/inventory-state";
import { ONE_UAH_TEST_PRODUCT_SLUG } from "@/lib/payment-test-product";
import ArrowUpRight from "@/components/ArrowUpRight";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import ProductActions from "@/components/ProductActions";
import ProductViewTracking from "@/components/ProductViewTracking";
import SmartProductImage from "@/components/SmartProductImage";
import { absoluteUrl, breadcrumbSchema, siteConfig } from "@/lib/seo";
import { getStoreProductBySlug } from "@/lib/store-products";
import { productIntro } from "@/lib/product-display";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getStoreProductBySlug(slug);
  if (!item) return { title: "Товар не знайдено", robots: { index: false, follow: false } };
  const path = `/product/${item.slug}`;
  const image = item.imageUrl ? absoluteUrl(item.imageUrl) : null;
  const isTestProduct = item.slug === ONE_UAH_TEST_PRODUCT_SLUG;
  return {
    title: item.seoTitle || item.name,
    description: item.seoDescription || item.description,
    alternates: { canonical: path },
    robots: isTestProduct ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: `${item.name} — купити в RESET Clinic`,
      description: item.seoDescription || item.description,
      url: absoluteUrl(path),
      siteName: "RESET Clinic Shop",
      locale: siteConfig.locale,
      type: "website",
      ...(image ? { images: [{ url: image, alt: item.name }] } : {}),
    },
    twitter: { card: "summary_large_image", title: item.name, description: item.seoDescription || item.description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function DynamicProductPage({ params }: Props) {
  const { slug } = await params;
  const item = await getStoreProductBySlug(slug);
  if (!item) notFound();
  const path = `/product/${item.slug}`;
  const isTestProduct = item.slug === ONE_UAH_TEST_PRODUCT_SLUG;
  const brandUrl = `/catalog?brand=${encodeURIComponent(item.brand)}`;
  const categoryName = item.category === "body" ? "Тіло" : item.category === "hair" ? "Волосся" : item.category === "face" ? "Обличчя" : "Каталог";
  const categoryPath = item.category === "body" ? "/body" : item.category === "hair" ? "/hair" : item.category === "face" ? "/face" : "/catalog";
  const inventory = getInventoryState({brand:item.brand,price:item.price,track_stock:item.trackStock,stock_quantity:item.stockQuantity,inventory_status:item.inventoryStatus});
  const needsPrice = inventory === "priced_missing";
  const needsAvailability = inventory === "unconfirmed";
  const inStock = inventory === "available";
  const onSale = item.discountPercent > 0 && item.originalPrice > item.price;
  const savings = onSale ? Math.round((item.originalPrice - item.price) * 100) / 100 : 0;
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${absoluteUrl(path)}#product`,
    name: item.name,
    description: item.description,
    ...(item.imageUrl ? { image: [absoluteUrl(item.imageUrl)] } : {}),
    url: absoluteUrl(path),
    ...(item.sku ? {sku:item.sku} : {}),
    brand: { "@type": "Brand", name: item.brand },
    category: categoryName,
    ...(needsPrice ? {} : {offers: {
      "@type": "Offer",
      url: absoluteUrl(path),
      priceCurrency: "UAH",
      price: Number(item.price).toFixed(2),
      ...(needsAvailability ? {} : {availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"}),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${siteConfig.url}/#organization` },
    }}),
  };
  const breadcrumbs = breadcrumbSchema([
    { name: "Головна", path: "/" },
    { name: categoryName, path: categoryPath },
    { name: item.brand, path: brandUrl },
    { name: item.name, path },
  ]);

  const isOfficialCutout = item.brand === "CU SKIN" && String(item.imageUrl || "").includes("/products/cu-skin-official/");
  return (
    <div className={`product-page-conversion product-page-premium product-page-audit-v2 product-page-feminine${isOfficialCutout ? " product-page--cu-skin-cutout" : ""}`}>
      <JsonLd data={[productSchema, breadcrumbs]} />
      <ProductViewTracking slug={item.slug} name={item.name} price={Number(item.price)} />
      <section className="product-conversion-hero product-object-hero">
        <div className="shell">
          <div className="breadcrumbs"><Link href="/">Головна</Link><span>/</span><Link href={categoryPath}>{categoryName}</Link><span>/</span><span>{item.name}</span></div>
          <div className="product-conversion-layout product-object-layout">
            <div className="product-gallery-panel product-object-gallery">
              <div className="product-gallery-main product-object-stage">
                <span className="product-gallery-tag">RESET SELECT</span>
                <span className="product-object-index">01 / PRODUCT</span>
                {onSale && <span className="shop-sale-badge product-detail-sale-badge">−{item.discountPercent}%</span>}
                <span className="product-object-halo" aria-hidden="true" />
                <SmartProductImage src={item.imageUrl} alt={item.name} className="dynamic-product-image" loading="eager" fallback={<div className="reset-product-image-placeholder reset-detail-placeholder" aria-label="Фото товару ще не додано"><span>{item.brand}</span><small>ФОТО ГОТУЄТЬСЯ</small></div>} />
                <div className="product-object-footer"><Link href={brandUrl} className="product-brand-link">{item.brand.toUpperCase()}</Link><span>{item.size || "PRO CARE"}</span><span>RESET CLINIC</span></div>
              </div>
            </div>

            <div className="product-detail-panel product-premium-detail">
              <span className="eyebrow"><Link href={brandUrl} className="product-brand-link">{item.brand.toUpperCase()} <ArrowUpRight /></Link> · {categoryName.toUpperCase()}</span>
              <h1>{item.name}</h1>
              {isTestProduct && <p role="note" style={{padding:"12px 16px",border:"1px solid currentColor",borderRadius:12}}>
                Тестова позиція для перевірки Monobank і GA4. З картки <strong>реально спишеться 1 грн</strong>. Фізичний товар та доставка відсутні. Оформлюйте окремо, з онлайн-оплатою.
              </p>}
              <p className="product-benefit-lead">{productIntro(item.description || item.shortDescription)}</p>

              <div className="product-purchase-deck product-purchase-deck-light">
                <div className="product-price-row product-price-card product-price-card-light">
                  <div className="product-price-main"><span className="product-price-label">{onSale ? "ЦІНА ЗІ ЗНИЖКОЮ" : "ЦІНА"}</span>{onSale && <del className="shop-detail-price-before">{item.originalPrice.toFixed(2)} грн</del>}<strong className="product-price-number">{needsPrice ? "Ціна уточнюється" : <>{Number(item.price).toFixed(2)} <em>грн</em></>}</strong>{onSale && <span className="shop-saving-label shop-detail-saving-label">Економія {savings.toLocaleString("uk-UA", { maximumFractionDigits: 2 })} грн</span>}</div>
                  <div className="product-price-side"><span>RESET CLINIC</span><small>{needsPrice ? "Вартість за запитом" : needsAvailability ? "Наявність уточнюється" : inStock ? "Доступно до замовлення" : "Немає в наявності"}</small></div>
                </div>
                {needsPrice ? <Link href="/contacts" className="checkout-payment-error">Уточнити ціну та наявність →</Link> : needsAvailability ? <Link href="/contacts" className="checkout-payment-error">Уточнити наявність товару →</Link> : inStock ? <ProductActions item={{ slug: item.slug, name: item.name, imageUrl: item.imageUrl, price: Number(item.price), maxQty: isTestProduct ? 1 : item.trackStock ? item.stockQuantity : 20 }} /> : <div className="checkout-payment-error">Товар тимчасово відсутній.</div>}
                <div className="product-shipping-line"><span>ДОСТАВКА</span><strong>Безкоштовно від 5000 грн</strong></div>
              </div>

              <div className="product-meta-strip">
                {item.size && <span><b>{item.size}</b> ОБ’ЄМ</span>}
                <span className="product-order-status"><i /> {needsPrice ? "ЦІНА УТОЧНЮЄТЬСЯ" : needsAvailability ? "НАЯВНІСТЬ УТОЧНЮЄТЬСЯ" : inStock ? "ДОСТУПНО ДО ЗАМОВЛЕННЯ" : "НЕМАЄ В НАЯВНОСТІ"}</span>
                <Link href={brandUrl} className="product-brand-link">{item.brand.toUpperCase()} <ArrowUpRight /></Link>
              </div>

              {item.keyIngredients.length > 0 && <div className="product-quick-facts product-quick-facts-icons">
                {item.keyIngredients.slice(0, 3).map((ingredient, index) => <div key={ingredient}><span>0{index + 1}</span><strong>{ingredient}</strong></div>)}
              </div>}

              <div className="product-consult-inline-v2"><div><span>НЕ ВПЕВНЕНІ У ВИБОРІ?</span><strong>Перевіримо сумісність із вашим поточним доглядом.</strong></div><Link href="/consultation">Підібрати догляд →</Link></div>

              <div className="product-detail-disclosures">
                {item.description && <details open className="product-full-description"><summary><span>Повний опис засобу</span><b>+</b></summary><div className="product-disclosure-body"><p>{item.description}</p></div></details>}
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
