import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import productImg from "@/assets/img/tovar1.webp";
import ProductActions from "@/components/ProductActions";
import { product } from "@/lib/product";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: `${product.name} — RESET Clinic`,
  description: product.description,
  alternates: { canonical: `/product/${product.slug}` },
};

export default function ProductPage() {
  return (
    <section className="product-page">
      <div className="shell">
        <div className="breadcrumbs"><Link href="/">Головна</Link><span>/</span><Link href="/catalog">Каталог</Link><span>/</span><span>{product.name}</span></div>
        <div className="product-layout">
          <div className="product-main-image"><Image src={productImg} alt={product.name} priority /></div>
          <div className="product-details">
            <span className="eyebrow">ДОГЛЯД ЗА ОБЛИЧЧЯМ</span>
            <h1>{product.name}</h1>
            <div className="product-price">{product.price}.00₴</div>
            <p className="product-description">{product.description}</p>
            <ProductActions />
            <div className="product-meta">
              <div><strong>Доставка</strong><span>Безкоштовно для замовлень від 5000 грн</span></div>
              <div><strong>Гарантія</strong><span>Офіційний сертифікований продукт</span></div>
              <div><strong>Консультація</strong><span>Допоможемо підібрати догляд</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
