import type { Metadata } from "next";
import { HomeFooter, HomeHeader } from "../../components/shop/NativeHome";
import { ShopCheckoutPage } from "../../components/shop/ShopCheckoutPage";
import { readNativeHomeSnapshot } from "../../lib/native-home";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Оформлення замовлення — RESET Shop",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const snapshot = await readNativeHomeSnapshot();
  return (
    <>
      <HomeHeader nodes={snapshot.header} />
      <ShopCheckoutPage />
      <HomeFooter nodes={snapshot.footer} />
    </>
  );
}
