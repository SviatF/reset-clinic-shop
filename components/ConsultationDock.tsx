"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ConsultationDock() {
  const pathname = usePathname();
  if (
    pathname === "/checkout" ||
    pathname === "/consultation" ||
    pathname.startsWith("/product/") ||
    pathname === "/catalog" ||
    pathname === "/face" || pathname.startsWith("/face/") ||
    pathname === "/body" || pathname.startsWith("/body/") ||
    pathname === "/hair" || pathname.startsWith("/hair/")
  ) return null;

  return (
    <Link href="/consultation" className="consultation-dock" aria-label="Підібрати догляд">
      <span className="consultation-dock-dot" />
      <span><small>НЕ ВПЕВНЕНІ У ВИБОРІ?</small><strong>Підібрати догляд →</strong></span>
    </Link>
  );
}
