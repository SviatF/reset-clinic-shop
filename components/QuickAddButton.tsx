"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { product } from "@/lib/product";

export default function QuickAddButton() {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function handleAdd() {
    add({ slug: product.slug, name: product.name, price: product.price }, 1);
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
      {added ? <><span>Додано</span><span>✓</span></> : <><span>Додати до кошика</span><span>+</span></>}
    </button>
  );
}
