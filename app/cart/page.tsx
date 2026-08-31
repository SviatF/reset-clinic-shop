import type { Metadata } from "next";
import { HomeFooter, HomeHeader } from "../../components/shop/NativeHome";
import { ShopCartPage } from "../../components/shop/ShopCartPage";
import { readNativeHomeSnapshot } from "../../lib/native-home";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Кошик — RESET Shop",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const snapshot = await readNativeHomeSnapshot();
  return (
    <>
      <HomeHeader nodes={snapshot.header} />
      <ShopCartPage />
      <HomeFooter nodes={snapshot.footer} />
    </>
  );
}
