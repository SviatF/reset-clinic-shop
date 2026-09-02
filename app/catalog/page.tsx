import Link from "next/link";
import { redirect } from "next/navigation";
import PremiumProductCard from "@/components/PremiumProductCard";
import { getStoreProducts } from "@/lib/store-products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CatalogPage({ searchParams }: { searchParams?: Promise<{ category?: string }> }) {
  const params = await searchParams;
  if (params?.category === "face") redirect("/face");
  if (params?.category === "body") redirect("/body");
  if (params?.category === "hair") redirect("/hair");
  const products = await getStoreProducts({ limit: 60 });
  const visible = products.length === 1 ? Array.from({ length: 8 }, () => products[0]) : products;
  return (
    <section className="catalog-page">
      <div className="shell">
        <div className="catalog-head"><span>RESET CLINIC SHOP</span><h1>Каталог</h1><p>Професійні засоби для обличчя, тіла та волосся.</p></div>
        <div className="catalog-filters"><span className="selected">ВСЕ</span><Link href="/face">ОБЛИЧЧЯ</Link><Link href="/body">ТІЛО</Link><Link href="/hair">ВОЛОССЯ</Link></div>
        <div className="category-product-grid catalog-premium-grid">
          {visible.map((item, index) => <PremiumProductCard key={`${item.slug}-${index}`} index={index + 1} productData={item} />)}
        </div>
      </div>
    </section>
  );
}
