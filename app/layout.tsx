import type { ReactNode } from "react";
import { headers } from "next/headers";
import { readNativeArchivePage } from "../lib/native-archive-page";
import { readNativeRootShell } from "../lib/native-shell";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-reset-path") ?? "/";

  const shell =
    pathname === "/" || pathname.startsWith("/product/")
      ? await readNativeRootShell()
      : await readNativeArchivePage(pathname);

  return (
    <html lang="uk">
      <head>
        <style>{"html,body{cursor:auto!important}"}</style>
      </head>
      <body id={shell?.bodyId} className={shell?.bodyClassName}>
        {children}
      </body>
    </html>
  );
}
