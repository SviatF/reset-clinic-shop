"use client";

import { useState, type ReactNode } from "react";

/**
 * R2 objects may be stored in D1 using the historical /shop-media URL.
 * Route them through the Worker-first /api/media endpoint, then retry the
 * historical URL before displaying the missing-photo placeholder.
 * Do not substitute another product's photo on failure.
 */
export function imageCandidates(source: string | null | undefined): string[] {
  if (!source || !((source.startsWith("/") && !source.startsWith("//")) || source.startsWith("https://")))
    return [];
  if (source.startsWith("/shop-media/")) {
    return ["/api/media/" + source.slice("/shop-media/".length), source];
  }
  return [source];
}

export default function SmartProductImage({
  src, alt, fallback, className, loading = "lazy",
}: {
  src?: string | null;
  alt: string;
  fallback: ReactNode;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState<{ src: string | null | undefined; step: number }>({src: undefined, step: 0});
  const candidates = imageCandidates(src);
  const step = failed.src === src ? failed.step : 0;
  if (step >= candidates.length) return <>{fallback}</>;
  return <img
    key={candidates[step]}
    src={candidates[step]}
    alt={alt}
    className={className}
    loading={loading}
    decoding="async"
    onError={() => setFailed({ src, step: step + 1 })}
  />;
}
