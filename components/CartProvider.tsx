"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartItem = { slug: string; name: string; price: number; qty: number; imageUrl?: string | null };
type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  isCartOpen: boolean;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/** Refresh locally cached cart prices against active catalog promotions. */
async function fetchCurrentPrices(snapshot: CartItem[]): Promise<{prices: Record<string, number>; images: Record<string, string | null>} | null> {
  if (!snapshot.length) return null;
  try {
    const response = await fetch("/api/cart/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ slugs: [...new Set(snapshot.map((item) => item.slug))] }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.prices && typeof data.prices === "object" ? { prices: data.prices, images: data.images && typeof data.images === "object" ? data.images : {} } : null;
  } catch { return null; }
}


export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);

  async function refreshCartPrices(snapshot: CartItem[]) {
    const catalog = await fetchCurrentPrices(snapshot);
    if (!catalog) return;
    setItems((current) => current.map((item) => {
      const nextPrice = catalog.prices[item.slug];
      const price = Number.isFinite(nextPrice) && nextPrice > 0 ? nextPrice : item.price;
      const imageUrl = Object.prototype.hasOwnProperty.call(catalog.images, item.slug)
        ? catalog.images[item.slug] : item.imageUrl;
      return price !== item.price || imageUrl !== item.imageUrl
        ? { ...item, price, imageUrl } : item;
    }));
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("reset-cart");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
          void refreshCartPrices(parsed);
        }
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("reset-cart", JSON.stringify(items));
  }, [items, ready]);

  useEffect(() => {
    document.body.style.overflow = isCartOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.qty, 0),
    total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
    isCartOpen,
    add: (item, qty = 1) => {
      if (!Number.isFinite(item.price) || !(item.price > 0)) return;
      setItems((current) => {
        const exists = current.find((row) => row.slug === item.slug);
        return exists
          ? current.map((row) => row.slug === item.slug ? { ...row, name: item.name, price: item.price, imageUrl: item.imageUrl || row.imageUrl, qty: Math.min(20, row.qty + qty) } : row)
          : [...current, { ...item, qty: Math.max(1,Math.min(20,qty)) }];
      });
      setCartOpen(true);
    },
    remove: (slug) => setItems((current) => current.filter((row) => row.slug !== slug)),
    setQty: (slug, qty) => setItems((current) => current.map((row) => row.slug === slug ? { ...row, qty: Math.max(1, Math.min(20,qty)) } : row)),
    clear: () => setItems([]),
    openCart: () => { setCartOpen(true); void refreshCartPrices(items); },
    closeCart: () => setCartOpen(false),
  }), [items, isCartOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
