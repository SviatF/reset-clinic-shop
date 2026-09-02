"use client";

import Image from "next/image";
import Link from "next/link";
import type { PointerEvent } from "react";
import productImg from "@/assets/img/tovar1.webp";
import QuickAddButton from "@/components/QuickAddButton";
import { product, productHref } from "@/lib/product";

export default function PremiumProductCard({ index = 1 }: { index?: number }) {
  const cardNumber = String(index).padStart(2, "0");

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const tiltY = ((x / rect.width) - 0.5) * 5;
    const tiltX = ((y / rect.height) - 0.5) * -4;

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
    <article
      className="premium-product-card"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="premium-card-surface">
        <Link href={productHref} className="premium-product-link" aria-label={`Відкрити ${product.name}`}>
          <div className="premium-product-media">
            <div className="premium-card-spotlight" aria-hidden="true" />
            <div className="premium-card-topline">
              <span>RESET EDIT / {cardNumber}</span>
              <span className="premium-card-status"><i /> PROFESSIONAL</span>
            </div>

            <div className="premium-product-stage">
              <span className="premium-orbit premium-orbit-one" aria-hidden="true" />
              <span className="premium-orbit premium-orbit-two" aria-hidden="true" />
              <span className="premium-product-shadow" aria-hidden="true" />
              <Image
                src={productImg}
                alt={product.name}
                sizes="(max-width: 700px) 46vw, 310px"
              />
              <div className="premium-hover-note">
                <span>RESET SELECTION</span>
                <strong>Професійний догляд</strong>
              </div>
            </div>

            <div className="premium-media-footer">
              <span>FACE CARE</span>
              <span>ANTI-OXIDANT</span>
            </div>
          </div>

          <div className="premium-product-copy">
            <div className="premium-product-heading">
              <span>ДОГЛЯД ЗА ЗОНОЮ НАВКОЛО ОЧЕЙ</span>
              <h3>{product.name}</h3>
            </div>
            <p>Зволоження, комфорт і антиоксидантний догляд для делікатної зони.</p>
            <div className="premium-product-meta">
              <strong>{product.price}.00₴</strong>
              <span>Детальніше <b>↗</b></span>
            </div>
          </div>
        </Link>

        <QuickAddButton />
      </div>
    </article>
  );
}
