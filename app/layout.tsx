import type { ReactNode } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import { headers } from "next/headers";
import { CartProvider } from "../components/cart/CartStore";
import { getNativePageMeta } from "../lib/native-content";

function nativeBodyClassName(className?: string) {
  return className
    ?.split(/\s+/)
    .filter((name) => name && name !== "has-mouse-dot" && name !== "has-mouse-circle")
    .join(" ");
}

async function readPublicStylesheet(href: string) {
  if (!href.startsWith("/native-styles/") || !href.endsWith(".css")) {
    return null;
  }

  const relativePath = href.replace(/^\/+/, "");
  const filePath = path.join(process.cwd(), "public", relativePath);

  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-reset-path") ?? "/";
  const shell = getNativePageMeta(pathname) ?? getNativePageMeta("/");

  const inlineStyles = await Promise.all(
    (shell?.stylesheets ?? []).map(async (href) => ({
      href,
      css: await readPublicStylesheet(href),
    })),
  );

  return (
    <html lang="uk">
      <head>
        <style>{"html,body{cursor:auto!important}"}</style>
        {shell?.links.map((link, index) => (
          <link
            href={link.href}
            rel={link.rel}
            media={link.media}
            key={`native-head-link-${index}-${link.href}`}
          />
        ))}
        {inlineStyles.map(({ href, css }) =>
          css ? (
            <style
              key={`native-inline-style-${href}`}
              data-native-stylesheet={href}
              dangerouslySetInnerHTML={{ __html: css }}
            />
          ) : (
            <link href={href} rel="stylesheet" key={`native-head-style-${href}`} />
          ),
        )}
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
