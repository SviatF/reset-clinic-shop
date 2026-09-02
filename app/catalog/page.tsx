import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import productImg from "@/assets/img/tovar1.webp";
import { product, productHref } from "@/lib/product";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CatalogPage({ searchParams }: { searchParams?: Promise<{ category?: string }> }) {
  const params = await searchParams;
  if (params?.category === "face") redirect("/face");
  if (params?.category === "body") redirect("/body");
  if (params?.category === "hair") redirect("/hair");

  return (
    <section className="catalog-page">
      <div className="shell">
        <div className="catalog-head"><span>RESET CLINIC SHOP</span><h1>Каталог</h1><p>Професійні засоби для обличчя, тіла та волосся.</p></div>
        <div className="catalog-filters"><span className="selected">ВСЕ</span><Link href="/face">ОБЛИЧЧЯ</Link><Link href="/body">ТІЛО</Link><Link href="/hair">ВОЛОССЯ</Link></div>
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
