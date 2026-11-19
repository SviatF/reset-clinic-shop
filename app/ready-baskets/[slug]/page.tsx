import ArrowUpRight from "@/components/ArrowUpRight";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readProducts } from "@/lib/commerce-json";
import { readPublishedReadyBaskets, readyBasketResolved } from "@/lib/ready-baskets";
import { productDisplayName } from "@/lib/product-display";
import SmartProductImage from "@/components/SmartProductImage";
import ReadyBasketVisual from "@/components/ReadyBasketVisual";
import ReadyBasketAddButton from "@/components/ReadyBasketAddButton";

export const dynamic = "force-dynamic";
type Props={params:Promise<{slug:string}>};
const money=(n:number)=>new Intl.NumberFormat("uk-UA",{style:"currency",currency:"UAH",maximumFractionDigits:2}).format(n);
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params;
 const basket=(await readPublishedReadyBaskets()).find(item=>item.slug===slug);
 if(!basket)return {title:"Добірку не знайдено",robots:{index:false}};
 return {title:basket.title+" — готовий кошик",description:basket.concern||basket.description||"Професійні добірки догляду RESET Clinic",alternates:{canonical:`/ready-baskets/${slug}`}};
}
export default async function ReadyBasketDetailPage({params}:Props){
 const {slug}=await params;
 const [baskets,products]=await Promise.all([readPublishedReadyBaskets(),readProducts()]);
 const match=baskets.find(item=>item.slug===slug);
 if(!match)notFound();
 const basket=readyBasketResolved(match,products);
 const forCart=basket.products.filter(x=>x.product).map(x=>({
  slug:x.slug,qty:x.qty,name:productDisplayName(x.product!),price:x.price,imageUrl:x.product!.image_url
 }));
 return <div className="rb-shop-page rb-detail-page">
  <div className="rb-detail-breadcrumb shell"><Link href="/">RESET CLINIC</Link><span>/</span><Link href="/ready-baskets">ГОТОВІ КОШИКИ</Link><span>/</span><span>{basket.title}</span></div>
  <div className="rb-detail-grid shell">
   <div className="rb-detail-visual">
    <ReadyBasketVisual basket={basket} products={basket.products.map(x=>x.product)}/>
    <span className="rb-detail-visual-label">RESET / CURATED ROUTINE</span>
   </div>
   <div className="rb-detail-information">
    <span className="rb-detail-kicker">ГОТОВИЙ КОШИК · {basket.count} ЗАСОБІВ</span>
    <h1>{basket.title}</h1>
    {basket.concern&&<div className="rb-concern"><small>ПОТРЕБА</small><p>{basket.concern}</p></div>}
    {basket.description&&<p className="rb-detail-description">{basket.description}</p>}
    <div className="rb-detail-price"><small>ВАРТІСТЬ ДОБІРКИ</small><strong>{money(basket.total)}</strong><span>За всі засоби з урахуванням актуальних цін</span></div>
    <ReadyBasketAddButton items={forCart} available={basket.available}/>
    {!basket.available&&<p className="rb-unavailable">Один або кілька засобів зараз недоступні. Перегляньте їх окремо або зверніться до косметолога.</p>}
    <p className="rb-detail-help">Склад і ціна перевіряються під час оформлення замовлення. Покупка здійснюється як звичайний кошик із окремих засобів.</p>
    <Link href="/consultation" className="rb-detail-consult">ПОРАДА КОСМЕТОЛОГА <span><ArrowUpRight /></span></Link>
   </div>
  </div>
  <section className="rb-included shell">
   <div className="rb-included-top"><span>02 / СКЛАД ДОБІРКИ</span><h2>Що входить<br/><em>у ваш догляд.</em></h2></div>
   <div className="rb-included-list">{basket.products.map((row,i)=><article key={row.slug} className="rb-included-item">
    <span className="rb-included-number">{String(i+1).padStart(2,"0")}</span>
    <div className="rb-included-image"><SmartProductImage src={row.product?.image_url} alt={row.product?.name||row.slug} fallback={<span>RESET</span>}/></div>
    <div className="rb-included-text"><span>{row.product?.brand||"НЕДОСТУПНИЙ ТОВАР"}</span>
     <h3>{row.product?productDisplayName(row.product):"Товар тимчасово недоступний"}</h3>
     {row.product?.short_description&&<p>{row.product.short_description}</p>}
    </div>
    <div className="rb-included-cost"><strong>{money(row.price*row.qty)}</strong><span>{row.qty} × {money(row.price)}</span>
     {row.product&&<Link href={`/product/${row.slug}`}>Детальніше <ArrowUpRight /></Link>}</div>
   </article>)}</div>
   <div className="rb-included-footer"><span>УСЬОГО ЗАСОБІВ: {basket.count}</span><strong>{money(basket.total)}</strong></div>
  </section>
 </div>;
}
