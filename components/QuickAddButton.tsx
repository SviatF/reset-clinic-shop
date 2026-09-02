"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { product } from "@/lib/product";

type QuickProduct = { slug: string; name: string; price: number };

export default function QuickAddButton({ item }: { item?: QuickProduct }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = item || { slug: product.slug, name: product.name, price: product.price };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function handleAdd() {
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
      aria-live="polite"
    >
      {added ? <>Додано <span>✓</span></> : <>Додати до кошика <span>+</span></>}
    </button>
  );
}
