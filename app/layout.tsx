import type { ReactNode } from "react";
import { headers } from "next/headers";
import { CartProvider } from "../components/cart/CartStore";
import { getNativePageMeta } from "../lib/native-content";

function nativeBodyClassName(className?: string) {
  return className
    ?.split(/\s+/)
    .filter((name) => name && name !== "has-mouse-dot" && name !== "has-mouse-circle")
    .join(" ");
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-reset-path") ?? "/";

  const shell = getNativePageMeta(pathname) ?? getNativePageMeta("/");

  return (
    <html lang="uk">
      <head>
        <style>{"html,body{cursor:auto!important}"}</style>
      </head>
      <body
        id={shell?.bodyId || undefined}
        className={nativeBodyClassName(shell?.bodyClassName) || undefined}
      >
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
