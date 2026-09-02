import type { Metadata } from "next";
import "./globals.css";
import "./refinements.css";
import "./secondary-pages.css";
import "./certificate-fixes.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
        </CartProvider>
      </body>
    </html>
  );
}
