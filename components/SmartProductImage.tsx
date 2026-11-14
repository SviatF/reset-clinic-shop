"use client";

import { useState, type ReactNode } from "react";

/**
 * Show a stable fallback for missing URLs and HTTP/image decode errors.
 * Never silently display another product's image when a remote image is broken.
 */
export default function SmartProductImage({
  src, alt, fallback, className, loading = "lazy",
}: {
  src?: string | null;
  alt: string;
  fallback: ReactNode;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const valid = Boolean(src && ((src.startsWith("/") && !src.startsWith("//")) || src.startsWith("https://")));
  if (!valid || failedSrc === src) return <>{fallback}</>;
  return <img src={src!} alt={alt} className={className} loading={loading}
    decoding="async" onError={() => setFailedSrc(src!)} />;
}
