"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  currency: "UAH" | "EUR" | "USD";
  image?: string;
  quantity: number;
  options: Record<string, string>;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  addItem: (item: CartItem) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "reset-shop-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved) as CartItem[]);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    document.querySelectorAll<HTMLElement>(".elementor-button-icon-qty").forEach((counter) => {
      counter.dataset.counter = String(items.reduce((total, item) => total + item.quantity, 0));
      counter.textContent = String(items.reduce((total, item) => total + item.quantity, 0));
    });
  }, [items]);

  const addItem = useCallback((next: CartItem) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === next.productId);
      if (!existing) return [...current, next];
      return current.map((item) =>
        item.productId === next.productId
          ? { ...item, quantity: item.quantity + next.quantity }
          : item,
      );
    });
  }, []);

  useEffect(() => {
    const onAddToCart = (event: Event) => {
      const detail = (event as CustomEvent<CartItem>).detail;
      if (detail?.productId) addItem(detail);
    };
    window.addEventListener("reset:add-to-cart", onAddToCart);
    return () => window.removeEventListener("reset:add-to-cart", onAddToCart);
  }, [addItem]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      addItem,
      setQuantity: (productId, quantity) =>
        setItems((current) =>
          current
            .map((item) => (item.productId === productId ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0),
        ),
      removeItem: (productId) =>
        setItems((current) => current.filter((item) => item.productId !== productId)),
      clear: () => setItems([]),
    }),
    [addItem, items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
