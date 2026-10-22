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
import "./ultra-premium.css";
import "./precision-premium.css";
import "./precision-card-motion.css";
import "./consultation-premium.css";
import "./premium-motion.css";
import "./commerce-polish.css";
import "./final-premium-polish.css";
import "./product-card-note-fix.css";
import "./product-audit-polish.css";
import "./product-conversion-final.css";
import "./product-compact-20.css";
import "./product-clean-luxury.css";
import "./product-feminine-luxury.css";
import "./product-readable-details.css";
import "./mono-payment.css";
import "./admin.css";
import heroSocial from "@/assets/img/hero-ph.webp";
import favicon from "@/assets/img/favicon.webp";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ConsultationDock from "@/components/ConsultationDock";
import PremiumMotion from "@/components/PremiumMotion";
import JsonLd from "@/components/JsonLd";
import { CartProvider } from "@/components/CartProvider";
import { localBusinessSchema, organizationSchema, siteConfig, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "RESET Clinic Shop — професійна косметика у Львові",
    template: "%s | RESET Clinic",
  },
  description: siteConfig.description,
  applicationName: "RESET Clinic Shop",
  creator: "RESET Clinic",
  publisher: "RESET Clinic",
  category: "beauty",
  icons: {
    icon: [{ url: favicon.src, type: "image/webp" }],
    shortcut: favicon.src,
  },
  keywords: [
    "професійна косметика",
    "косметика Львів",
    "догляд за обличчям",
    "догляд за тілом",
    "догляд за волоссям",
    "косметолог Львів",
    "RESET Clinic",
  ],
  alternates: {
    languages: { "uk-UA": "/" },
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: "RESET Clinic Shop",
    title: "RESET Clinic Shop — професійна косметика та підбір догляду",
    description: siteConfig.description,
    images: [{ url: heroSocial.src, width: heroSocial.width, height: heroSocial.height, alt: "RESET Clinic Shop" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RESET Clinic Shop — професійна косметика",
    description: siteConfig.description,
    images: [heroSocial.src],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body>
        <JsonLd data={[organizationSchema, localBusinessSchema, websiteSchema]} />
        <CartProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <ConsultationDock />
          <CartDrawer />
          <PremiumMotion />
        </CartProvider>
      </body>
    </html>
  );
}
