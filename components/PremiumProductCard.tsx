"use client";
import ArrowUpRight from "@/components/ArrowUpRight";

import Link from "next/link";
import type { PointerEvent } from "react";
import QuickAddButton from "@/components/QuickAddButton";
import SmartProductImage from "@/components/SmartProductImage";

type CardProduct = {
  slug: string;
  name: string;
  brand?: string;
  category?: "face" | "body" | "hair" | "other";
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  trackStock?: boolean;
  stockQuantity?: number;
  size?: string;
  imageUrl?: string | null;
  shortDescription?: string;
  hoverLabel?: string;
  hoverTitle?: string;
  hoverText?: string;
};

const categoryLabels: Record<string, string> = { face: "FACE CARE", body: "BODY CARE", hair: "HAIR CARE", other: "PRO CARE" };

export default function PremiumProductCard({ index = 1, productData }: { index?: number; productData: CardProduct }) {
  const cardNumber = String(index).padStart(2, "0");
  const current = productData;
  const onSale = Number(current.discountPercent) > 0 && Number(current.originalPrice) > Number(current.price);
  const savings = onSale ? Math.round((Number(current.originalPrice) - Number(current.price)) * 100) / 100 : 0;
  const href = `/product/${current.slug}`;

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const tiltY = ((x / rect.width) - 0.5) * 7;
    const tiltX = ((y / rect.height) - 0.5) * -5;

    card.style.setProperty("--spot-x", `${x}px`);
    card.style.setProperty("--spot-y", `${y}px`);
    card.style.setProperty("--tilt-x", `${tiltX}deg`);
    card.style.setProperty("--tilt-y", `${tiltY}deg`);
  }

  function handlePointerLeave(event: PointerEvent<HTMLElement>) {
    const card = event.currentTarget;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <article className="premium-product-card" onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
      <div className="premium-card-surface">
        <Link href={href} className="premium-product-link" aria-label={`Відкрити ${current.name}`}>
          <div className="premium-product-media">
            <div className="premium-card-spotlight" aria-hidden="true" />
            <div className="premium-card-topline"><span>RESET EDIT / {cardNumber}</span><span className="premium-card-status"><i /> PROFESSIONAL</span></div>
            {onSale && <span className="shop-sale-badge premium-card-sale-badge">−{current.discountPercent}%</span>}
            <div className="premium-product-stage">
              <span className="premium-stage-shine" aria-hidden="true" />
              <span className="premium-orbit premium-orbit-one" aria-hidden="true" />
              <span className="premium-orbit premium-orbit-two" aria-hidden="true" />
              <span className="premium-product-shadow" aria-hidden="true" />
              <SmartProductImage src={current.imageUrl} alt={current.name} fallback={<div className="reset-product-image-placeholder" aria-label={`Фото товару ${current.brand || ""} буде додано`}><span>{current.brand || "RESET CLINIC"}</span><small>ФОТО ГОТУЄТЬСЯ</small></div>} />
              <div className="premium-hover-note"><span>{current.hoverLabel || "ПРИЗНАЧЕННЯ"}</span><strong>{current.hoverTitle || current.shortDescription}</strong><small>{current.hoverText || current.size || current.brand}</small></div>
            </div>
            <div className="premium-media-footer"><span>{categoryLabels[current.category || "other"]}</span><span>{current.brand || "RESET SELECT"}</span></div>
          </div>
          <div className="premium-product-copy">
            <div className="premium-product-heading"><span>{current.category === "hair" ? "ДОГЛЯД ЗА ВОЛОССЯМ" : current.category === "body" ? "ДОГЛЯД ЗА ТІЛОМ" : "ПРОФЕСІЙНИЙ ДОГЛЯД"}</span><h3>{current.name}</h3></div>
            <p>{current.shortDescription || "Професійний засіб, відібраний RESET Clinic."}</p>
            <div className="premium-product-meta"><div className={`shop-price-stack${onSale ? " shop-price-stack--sale" : ""}`}>{onSale && <del className="shop-price-before">{Number(current.originalPrice).toFixed(2)} грн</del>}<strong className="shop-price-current">{Number(current.price).toFixed(2)} грн</strong>{onSale && <small className="shop-saving-label">Економія {savings.toLocaleString("uk-UA", { maximumFractionDigits: 2 })} грн</small>}</div><span>Детальніше <b><ArrowUpRight /></b></span></div>
          </div>
        </Link>
        <QuickAddButton item={{ slug: current.slug, name: current.name, price: Number(current.price), inStock: current.trackStock !== true || Number(current.stockQuantity ?? 0) > 0 }} />
      </div>
    </article>
  );
}
