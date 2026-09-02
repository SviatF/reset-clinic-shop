import Link from "next/link";
import type { Product } from "../../lib/catalog/product";
import styles from "./catalog-page.module.css";

type CatalogPageProps = {
  title: string;
  description?: string;
  products: Product[];
};

function formatPrice(product: Product) {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: product.price.currency,
    maximumFractionDigits: product.price.currency === "UAH" ? 0 : 2,
  }).format(product.price.amount);
}

export function CatalogPage({ title, description, products }: CatalogPageProps) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>RESET SHOP</p>
        <h1>{title}</h1>
        {description ? <div>{description}</div> : null}
      </header>

      {products.length ? (
        <div className={styles.grid}>
          {products.map((product) => (
            <article className={styles.card} key={product.id}>
              <Link className={styles.image} href={`/product/${product.slug}/`}>
                {product.images[0] ? (
                  <img src={product.images[0].url} alt={product.images[0].alt || product.name} />
                ) : (
                  <span aria-hidden="true" />
                )}
              </Link>
              <p className={styles.category}>{product.category.name}</p>
              <h2>
                <Link href={`/product/${product.slug}/`}>{product.name}</Link>
              </h2>
              <p className={styles.price}>{formatPrice(product)}</p>
            </article>
          ))}
        </div>
      ) : (
        <section className={styles.empty}>
          <p>Каталог готується до наповнення.</p>
          <span>Тут автоматично з’являться товари, додані адміністратором.</span>
        </section>
      )}
    </main>
  );
}
