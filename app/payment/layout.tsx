import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Статус оплати",
  robots: { index: false, follow: false, noarchive: true },
};

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
