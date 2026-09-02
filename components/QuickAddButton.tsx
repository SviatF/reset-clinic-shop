"use client";

import { useCart } from "@/components/CartProvider";
import { product } from "@/lib/product";

export default function QuickAddButton() {
  const { add } = useCart();
  return <button type="button" className="quick-add" onClick={() => add({ slug: product.slug, name: product.name, price: product.price }, 1)}>Швидко додати <span>+</span></button>;
}
