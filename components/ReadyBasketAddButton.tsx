"use client";
import ArrowUpRight from "@/components/ArrowUpRight";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";

type Item = { slug: string; name: string; price: number; qty: number; imageUrl: string | null };
export default function ReadyBasketAddButton({items,available}:{items:Item[];available:boolean}) {
 const { add } = useCart();
 const [added,setAdded] = useState(false);
 function addAll() {
  if(!available || !items.length)return;
  for(const item of items) {
   add({slug:item.slug,name:item.name,price:item.price,imageUrl:item.imageUrl},item.qty);
  }
  setAdded(true);
 }
 return <button className="rb-buy-button" type="button" disabled={!available} onClick={addAll}>
  {added ? "ТОВАРИ ДОДАНО ДО КОШИКА" : available ? "ДОДАТИ ВЕСЬ НАБІР ДО КОШИКА" : "НАБІР ТИМЧАСОВО НЕДОСТУПНИЙ"}
  <span aria-hidden="true"><ArrowUpRight /></span>
 </button>;
}
