"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { product } from "@/lib/product";

export default function ProductActions() {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();

  function addToCart() {
    add({ slug: product.slug, name: product.name, price: product.price }, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="product-actions-panel">
      <div className="qty-control" aria-label="Кількість">
        <button onClick={() => setQty((v) => Math.max(1, v - 1))}>−</button><span>{qty}</span><button onClick={() => setQty((v) => v + 1)}>+</button>
      </div>
      <button className="add-cart" onClick={addToCart}>{added ? "ДОДАНО ДО КОШИКА" : "ДОДАТИ ДО КОШИКА"}</button>
    </div>
  );
}
