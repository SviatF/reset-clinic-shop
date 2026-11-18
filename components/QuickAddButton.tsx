"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import Link from "next/link";
import type { InventoryState } from "@/lib/inventory-state";

type QuickProduct = { slug: string; name: string; price: number; imageUrl?: string | null; inStock?: boolean; availability?: InventoryState };

export default function QuickAddButton({ item }: { item: QuickProduct }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current: QuickProduct = item;

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function handleAdd() {
    if (current.inStock === false || !(current.price > 0)) return;
    add({ slug: current.slug, name: current.name, price: current.price, imageUrl: current.imageUrl }, 1);
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1300);
  }

  if(current.availability==="unconfirmed"||current.availability==="priced_missing") {
    return <Link className="quick-add quick-add--inquiry" href="/contacts" aria-label={(current.availability==="priced_missing"?"Уточнити ціну: ":"Уточнити наявність: ")+current.name}>
      {current.availability==="priced_missing"?"Уточнити ціну ↗":"Уточнити наявність ↗"}
    </Link>;
  }
  return (
    <button
      type="button"
      className={`quick-add ${added ? "is-added" : ""}`}
      onClick={handleAdd}
      disabled={current.inStock === false || !(current.price > 0)}
      aria-live="polite"
    >
      {!(current.price > 0) ? "Ціна уточнюється" : current.inStock === false ? "Немає в наявності" : added ? <>Додано <span>✓</span></> : <>Додати до кошика <span>+</span></>}
    </button>
  );
}
