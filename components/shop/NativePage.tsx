import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  getNativePageMeta,
  readNativeContentPage,
  readNativeContentShell,
} from "../../lib/native-content";
import { NativeTree } from "./NativeHeader";
import { NativeInteractions } from "./NativeInteractions";

type NativeResourcesProps = {
  pathname: string;
};

export function NativeResources({ pathname }: NativeResourcesProps) {
  const meta = getNativePageMeta(pathname) ?? getNativePageMeta("/");
  if (!meta) return null;

  return (
    <>
      {meta.links.map((link, index) => (
        <link
          href={link.href}
          rel={link.rel}
          media={link.media}
          key={`native-link-${index}-${link.href}`}
        />
      ))}
      {meta.stylesheets.map((href) => (
        <link href={href} rel="stylesheet" key={`native-style-${href}`} />
      ))}
    </>
  );
}

type NativeShellProps = {
  children: ReactNode;
  resourcePathname?: string;
};

export async function NativeShell({ children, resourcePathname = "/" }: NativeShellProps) {
  const shell = await readNativeContentShell();

  return (
    <>
      <NativeResources pathname={resourcePathname} />
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

  return (
    <NativeShell resourcePathname={page.pathname}>
      <NativeTree nodes={page.nodes} keyPrefix={`native-page-${page.pathname}`} />
    </NativeShell>
  );
}
