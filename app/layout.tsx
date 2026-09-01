import type { ReactNode } from "react";
import { readNativeRootShell } from "../lib/native-shell";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const shell = await readNativeRootShell();

  return (
    <html lang="uk">
      <head>
        <style>{"html,body{cursor:auto!important}"}</style>
      </head>
      <body id={shell.bodyId} className={shell.bodyClassName}>
        {children}
      </body>
    </html>
  );
}
