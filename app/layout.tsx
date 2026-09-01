import type { ReactNode } from "react";
import { NativeTree } from "../components/shop/NativeHeader";
import { readNativeRootShell } from "../lib/native-shell";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const shell = await readNativeRootShell();

  return (
    <html lang="uk">
      <head>
        <NativeTree nodes={shell.head} keyPrefix="head" />
        <style>{"html,body{cursor:auto!important}"}</style>
      </head>
      <body id={shell.bodyId} className={shell.bodyClassName}>
        {children}
      </body>
    </html>
  );
}
