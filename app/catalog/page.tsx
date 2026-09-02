import Image from "next/image";
import Link from "next/link";
import productImg from "@/assets/img/tovar1.webp";
import { product, productHref } from "@/lib/product";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CatalogPage() {
  return (
    <section className="catalog-page">
      <div className="shell">
        <div className="catalog-head"><span>RESET CLINIC SHOP</span><h1>Каталог</h1><p>Професійні засоби для обличчя, тіла та волосся.</p></div>
        <div className="catalog-filters"><button className="selected">ВСЕ</button><button>ОБЛИЧЧЯ</button><button>ТІЛО</button><button>ВОЛОССЯ</button></div>
        <div className="catalog-grid">
          {Array.from({ length: 8 }).map((_, index) => (
            <Link className="product-card" href={productHref} key={index}>
              <div className="product-image"><Image src={productImg} alt={product.name} /></div>
              <div className="product-copy"><strong>{product.name.toUpperCase()}</strong><span>{product.price}.00₴</span></div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
