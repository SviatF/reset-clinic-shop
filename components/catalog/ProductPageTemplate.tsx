import Link from "next/link";
import type { Product } from "../../lib/catalog/product";
import { ProductGallery } from "./ProductGallery";
import { ProductPurchasePanel } from "./ProductPurchasePanel";
import styles from "./product-page.module.css";

type ProductPageTemplateProps = {
  product: Product;
};

const CURRENCY_LOCALES = {
  UAH: "uk-UA",
  EUR: "uk-UA",
  USD: "uk-UA",
} as const;

function formatPrice(amount: number, currency: Product["price"]["currency"]) {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "UAH" ? 0 : 2,
  }).format(amount);
}

export function ProductPageTemplate({ product }: ProductPageTemplateProps) {
  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Навігація">
        <Link href="/">Головна</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/category/${product.category.slug}/`}>{product.category.name}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <article className={styles.product}>
        <ProductGallery images={product.images} productName={product.name} />

        <div className={styles.summary}>
          <p className={styles.eyebrow}>{product.category.name}</p>
          <h1>{product.name}</h1>

          <div className={styles.priceRow}>
            <p className={styles.price}>{formatPrice(product.price.amount, product.price.currency)}</p>
            {product.compareAtPrice ? (
              <p className={styles.comparePrice}>
                {formatPrice(product.compareAtPrice.amount, product.compareAtPrice.currency)}
              </p>
            ) : null}
          </div>

          {product.shortDescription ? (
            <p className={styles.shortDescription}>{product.shortDescription}</p>
          ) : null}

          <p className={styles.stock} data-available={product.inStock}>
            {product.inStock ? "В наявності" : "Немає в наявності"}
          </p>

          <ProductPurchasePanel
            productId={product.id}
            slug={product.slug}
            productName={product.name}
            price={product.price.amount}
            currency={product.price.currency}
            image={product.images[0]?.url}
            inStock={product.inStock}
            options={product.options}
          />

          {product.sku ? <p className={styles.sku}>Артикул: {product.sku}</p> : null}
        </div>
      </article>

      {product.description || product.specifications?.length ? (
        <section className={styles.details}>
          {product.description ? (
            <div className={styles.description}>
              <p className={styles.eyebrow}>Про товар</p>
              <h2>Опис</h2>
              <p>{product.description}</p>
            </div>
          ) : null}

          {product.specifications?.length ? (
            <dl className={styles.specifications}>
              {product.specifications.map((item) => (
                <div key={`${item.label}-${item.value}`}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
