"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartItem = { slug: string; name: string; price: number; qty: number };
type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("reset-cart");
      if (stored) setItems(JSON.parse(stored));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("reset-cart", JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.qty, 0),
    total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
    add: (item, qty = 1) => setItems((current) => {
      const exists = current.find((row) => row.slug === item.slug);
      return exists
        ? current.map((row) => row.slug === item.slug ? { ...row, qty: row.qty + qty } : row)
        : [...current, { ...item, qty }];
    }),
    remove: (slug) => setItems((current) => current.filter((row) => row.slug !== slug)),
    setQty: (slug, qty) => setItems((current) => current.map((row) => row.slug === slug ? { ...row, qty: Math.max(1, qty) } : row)),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
