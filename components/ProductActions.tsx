"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { product } from "@/lib/product";

type ActionProduct = { slug: string; name: string; price: number; maxQty?: number };

export default function ProductActions({ item }: { item?: ActionProduct }) {
  const current = item || { slug: product.slug, name: product.name, price: product.price, maxQty: 20 };
  const maxQty = Math.max(1, Math.min(20, current.maxQty || 20));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();

  function addToCart() {
    add({ slug: current.slug, name: current.name, price: current.price }, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="product-actions-panel">
      <div className="qty-control" aria-label="Кількість">
        <button type="button" onClick={() => setQty((v) => Math.max(1, v - 1))}>−</button>
        <span>{qty}</span>
        <button type="button" onClick={() => setQty((v) => Math.min(maxQty, v + 1))}>+</button>
      </div>
      <button type="button" className="add-cart" onClick={addToCart}>{added ? "ДОДАНО ДО КОШИКА" : "ДОДАТИ ДО КОШИКА"}</button>
    </div>
  );
}
