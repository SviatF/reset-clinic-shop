import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import manifestJson from "../content/native/manifest.json";
import type { NativeNode } from "./native-dom";

export type NativeStylesheetLink = {
  href: string;
  rel: string;
  media?: string;
};

export type NativePageMeta = {
  file: string;
  title: string;
  bodyClassName: string;
  bodyId: string;
  stylesheets: string[];
  links: NativeStylesheetLink[];
};

export type NativeContentPage = NativePageMeta & {
  pathname: string;
  nodes: NativeNode[];
};

export type NativeContentShell = {
  header: NativeNode[];
  footer: NativeNode[];
};

const CONTENT_ROOT = path.join(process.cwd(), "content", "native");
const ROUTES_ROOT = path.join(CONTENT_ROOT, "routes");
const manifest = manifestJson as Record<string, NativePageMeta>;

export function normalizeNativePathname(pathname: string) {
  const clean = pathname.split("?", 1)[0]?.split("#", 1)[0] || "/";
  if (clean === "/") return clean;
  return `/${clean.split("/").filter(Boolean).join("/")}/`;
}

export function getNativePageMeta(pathname: string): NativePageMeta | null {
  return manifest[normalizeNativePathname(pathname)] ?? null;
}

export function getNativeSnapshotRoutes() {
  return Object.keys(manifest);
}

export const readNativeContentPage = cache(
  async (pathname: string): Promise<NativeContentPage | null> => {
    const normalized = normalizeNativePathname(pathname);
    const meta = manifest[normalized];
    if (!meta) return null;

    const payload = JSON.parse(
      await fs.readFile(path.join(ROUTES_ROOT, meta.file), "utf8"),
    ) as { nodes: NativeNode[] };

    return {
      ...meta,
      pathname: normalized,
      nodes: payload.nodes,
    };
  },
);

export const readNativeContentShell = cache(async (): Promise<NativeContentShell> => {
  return JSON.parse(
    await fs.readFile(path.join(CONTENT_ROOT, "shell.json"), "utf8"),
  ) as NativeContentShell;
});
