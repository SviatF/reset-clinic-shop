"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { product } from "@/lib/product";

type QuickProduct = { slug: string; name: string; price: number; inStock?: boolean };

export default function QuickAddButton({ item }: { item?: QuickProduct }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current: QuickProduct = item || { slug: product.slug, name: product.name, price: product.price, inStock: true };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function handleAdd() {
    if (current.inStock === false) return;
    add({ slug: current.slug, name: current.name, price: current.price }, 1);
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1300);
  }

  return (
    <button
      type="button"
      className={`quick-add ${added ? "is-added" : ""}`}
      onClick={handleAdd}
      disabled={current.inStock === false}
      aria-live="polite"
    >
      {current.inStock === false ? "Немає в наявності" : added ? <>Додано <span>✓</span></> : <>Додати до кошика <span>+</span></>}
    </button>
  );
}
