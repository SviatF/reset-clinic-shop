"use client";
import Link from "next/link";
import Image from "next/image";
import aesopProductImage from "@/assets/img/tovar1.webp";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import type { StoreProduct } from "@/lib/store-products";
const money=(v:number)=>new Intl.NumberFormat("uk-UA",{maximumFractionDigits:2}).format(v);

export default function ShopProductCard({item}:{item:StoreProduct}){
 const {add}=useCart();
 const [added,setAdded]=useState(false);
 const canBuy=!item.trackStock||item.stockQuantity>0;
 return <article className="rs-card">
  <Link className="rs-card-media" href={"/product/"+item.slug} aria-label={"Переглянути "+item.name}>
   {item.imageUrl?<img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async"/>:
    item.slug === "parsley-seed-anti-oxidant-eye-cream" ? <Image src={aesopProductImage} alt={item.name} sizes="(max-width:720px) 46vw, 23vw"/> :
    <div className="rs-card-placeholder"><strong>{item.brand}</strong><small>Фото додається</small></div>}
  </Link>
  <div className="rs-card-body">
   <Link className="rs-card-brand" href={`/catalog?brand=${encodeURIComponent(item.brand)}`} title={`Усі товари бренду ${item.brand}`}>{item.brand} ↗</Link>
   <Link className="rs-card-name" href={"/product/"+item.slug}>{item.name}</Link>
   {item.size&&<span className="rs-card-size">{item.size}</span>}
   <div className="rs-card-footer">
    <strong className="rs-card-price">{money(item.price)} <small>грн</small></strong>
    <button type="button" className="rs-card-add" disabled={!canBuy}
     aria-label={"Додати до кошика: "+item.name}
     onClick={()=>{if(!canBuy)return;add({slug:item.slug,name:item.name,price:item.price},1);setAdded(true)}}>
     {!canBuy?"Немає":added?"Додано ✓":"У кошик +"}
    </button>
   </div>
  </div>
 </article>;
}
