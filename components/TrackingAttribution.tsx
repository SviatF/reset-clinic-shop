"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureShopAttribution } from "@/lib/checkout-tracking";

/** Preserve landing campaign parameters across App Router navigations. */
export default function TrackingAttribution() {
  const pathname=usePathname();
  useEffect(()=>{captureShopAttribution();},[pathname]);
  return null;
}
