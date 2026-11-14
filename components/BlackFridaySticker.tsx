"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Kyiv is UTC+02:00 after the October daylight-saving transition. */
const CAMPAIGN_END = new Date("2026-11-27T23:59:59+02:00").getTime();
const DISMISS_KEY = "reset-shop-bf-2026-reference-sticker-dismissed";

function remainingParts(remaining: number) {
  const seconds = Math.max(0, Math.floor(remaining / 1000));
  return [
    Math.floor(seconds / 86400),
    Math.floor((seconds % 86400) / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ];
}

export default function BlackFridaySticker() {
  const pathname = usePathname() || "/";
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const calculate = () => setRemaining(Math.max(0, CAMPAIGN_END - Date.now()));
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // The close button remains functional when storage is not available.
    }
    calculate();
    const interval = window.setInterval(calculate, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Keep checkout/payment and account forms distraction-free.
  const excluded =
    pathname === "/admin" || pathname.startsWith("/admin/") ||
    pathname === "/checkout" || pathname.startsWith("/checkout/") ||
    pathname === "/payment" || pathname.startsWith("/payment/") ||
    pathname === "/account" || pathname.startsWith("/account/") ||
    pathname === "/cart" || pathname.startsWith("/cart/") ||
    pathname.startsWith("/api/");

  if (excluded || remaining === null || remaining <= 0 || dismissed) return null;

  const [days, hours, minutes, seconds] = remainingParts(remaining);
  const units = [
    { amount: days, label: "дн" },
    { amount: hours, label: "год" },
    { amount: minutes, label: "хв" },
    { amount: seconds, label: "сек" },
  ];

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Dismissal still applies for the current render.
    }
  };

  return (
    <aside className="bf26-sticker" aria-label="Black Friday: до 20 відсотків знижки на професійну косметику до 27 листопада">
      <span className="bf26-ribbon bf26-ribbon--left" aria-hidden="true" />
      <span className="bf26-ribbon bf26-ribbon--right" aria-hidden="true" />
      <button className="bf26-close" type="button" onClick={dismiss} aria-label="Закрити стікер Black Friday">
        <span aria-hidden="true">×</span>
      </button>

      <div className="bf26-main">
        <div className="bf26-event" aria-label="BLACK FRIDAY">
          <span>BLACK</span>
          <span>FRIDAY</span>
        </div>
        <span className="bf26-separator" aria-hidden="true" />
        <div className="bf26-offer">
          <div className="bf26-discount">
            <span>ДО</span>
            <strong>−20%</strong>
          </div>
          <p className="bf26-product">На професійну косметику</p>
          <p className="bf26-date">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M7 2v6M17 2v6M3 10h18" />
            </svg>
            До 27.11 включно
          </p>
        </div>
      </div>

      <div className="bf26-bottom">
        <div className="bf26-countdown">
          <span className="bf26-countdown-heading">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="13" r="8.5" />
              <path d="M12 8v5l3 2M9 2h6" />
            </svg>
            До завершення:
          </span>
          <div className="bf26-timer" role="timer" aria-live="off" aria-label={`До завершення акції: ${days} днів, ${hours} годин, ${minutes} хвилин, ${seconds} секунд`}>
            {units.map((unit) => (
              <span className="bf26-time" key={unit.label}>
                <strong>{String(unit.amount).padStart(2, "0")}</strong>
                <small>{unit.label}</small>
              </span>
            ))}
          </div>
        </div>

        <Link className="bf26-cta" href="/catalog" aria-label="Перейти до каталогу косметики">
          <span>В магазин</span>
          <span className="bf26-cta-arrow" aria-hidden="true">↗</span>
        </Link>
      </div>
    </aside>
  );
}
