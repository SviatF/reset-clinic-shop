import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  readNativeContentPage,
  readNativeContentShell,
} from "../../lib/native-content";
import { CategoryShowcase } from "../home/CategoryShowcase";
import { NativeTree } from "./NativeHeader";
import { NativeInteractions } from "./NativeInteractions";

type NativeShellProps = {
  children: ReactNode;
  resourcePathname?: string;
};

export async function NativeShell({ children }: NativeShellProps) {
  const shell = await readNativeContentShell();

  return (
    <>
      <NativeInteractions />
      <NativeTree nodes={shell.header} keyPrefix="native-header" />
      {children}
      <NativeTree nodes={shell.footer} keyPrefix="native-footer" />
    </>
  );
}

export async function NativeSnapshotPage({ pathname }: { pathname: string }) {
  const page = await readNativeContentPage(pathname);
  if (!page) notFound();

  const isHome = page.pathname === "/";

  return (
    <NativeShell resourcePathname={page.pathname}>
      <NativeTree
        nodes={page.nodes}
        keyPrefix={`native-page-${page.pathname}`}
        injectAfterDataId={isHome ? "039aeb8" : undefined}
        injectedContent={isHome ? <CategoryShowcase /> : undefined}
      />
    </NativeShell>
  );
}
