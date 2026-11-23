"use client";

import { useEffect, useRef } from "react";
import { pushEcommerceEvent } from "@/lib/checkout-tracking";

/** Tracks real product detail views, including unavailable products. */
export default function ProductViewTracking({slug,name,price}:{slug:string;name:string;price:number}) {
  const lastTracked=useRef<string|null>(null);
  useEffect(()=>{
    if(!slug||!name||lastTracked.current===slug)return;
    lastTracked.current=slug;
    const priced=Number.isFinite(price)&&price>0;
    pushEcommerceEvent("view_item",{
      ...(priced?{currency:"UAH",value:Math.round(price*100)/100}:{}),
      items:[{item_id:slug,item_name:name,...(priced?{price:Math.round(price*100)/100}:{})}]
    });
  },[slug,name,price]);
  return null;
}
