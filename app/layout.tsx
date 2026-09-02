import type { Metadata } from "next";
import "./globals.css";
import "./refinements.css";
import "./secondary-pages.css";
import "./certificate-fixes.css";
import "./conversion.css";
import "./conversion-extras.css";
import "./account-conversion.css";
import "./trust-layer.css";
import "./premium-product-cards.css";
import "./premium-product-cards-compat.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ConsultationDock from "@/components/ConsultationDock";
import { CartProvider } from "@/components/CartProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://reset-clinic-shop.vercel.app"),
  title: "RESET Clinic — професійний догляд",
  description: "Професійний догляд за обличчям, тілом і волоссям від RESET Clinic.",
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body>
        <CartProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <ConsultationDock />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}