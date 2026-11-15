"use client";
import ArrowUpRight from "@/components/ArrowUpRight";
import Link from "next/link";
import SmartProductImage from "@/components/SmartProductImage";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import type { StoreProduct } from "@/lib/store-products";
const money=(v:number)=>new Intl.NumberFormat("uk-UA",{maximumFractionDigits:2}).format(v);

export default function ShopProductCard({item}:{item:StoreProduct}){
 const {add}=useCart();
 const [added,setAdded]=useState(false);
 const canBuy=!item.trackStock||item.stockQuantity>0;
 return <article className={item.brand === "OLIE\u0027RE PARIS" ? "rs-card rs-card--hair-cutout" : "rs-card"}>
  <Link className="rs-card-media" href={"/product/"+item.slug} aria-label={"Переглянути "+item.name}>
   <SmartProductImage src={item.imageUrl} alt={item.name} fallback={<div className="rs-card-placeholder"><strong>{item.brand}</strong><small>Фото додається</small></div>} />
   {item.discountPercent > 0 && <span className="shop-sale-badge rs-card-sale-badge">−{item.discountPercent}%</span>}
  </Link>
  <div className="rs-card-body">
   <Link className="rs-card-brand" href={`/catalog?brand=${encodeURIComponent(item.brand)}`} title={`Усі товари бренду ${item.brand}`}>{item.brand} <ArrowUpRight /></Link>
   <Link className="rs-card-name" href={"/product/"+item.slug}>{item.name}</Link>
   {item.size&&<span className="rs-card-size">{item.size}</span>}
   <div className="rs-card-footer">
    <div className="shop-price-stack">{item.discountPercent > 0 && <del className="shop-price-before">{money(item.originalPrice)} грн</del>}<strong className="rs-card-price shop-price-current">{money(item.price)} <small>грн</small></strong></div>
    <button type="button" className="rs-card-add" disabled={!canBuy}
     aria-label={"Додати до кошика: "+item.name}
     onClick={()=>{if(!canBuy)return;add({slug:item.slug,name:item.name,price:item.price},1);setAdded(true)}}>
     {!canBuy?"Немає":added?"Додано ✓":"У кошик +"}
    </button>
   </div>
  </div>
 </article>;
}
