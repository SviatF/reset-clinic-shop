import { NextResponse } from "next/server";
import { readLocalBinaryAsset, usingLocalJsonStore } from "@/lib/json-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mimeByExt: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export async function GET(_: Request, context: { params: Promise<{ path: string[] }> }) {
  if (!usingLocalJsonStore()) return new NextResponse("Not found", { status: 404 });
  const { path } = await context.params;
  const relative = (path || []).join("/");
  if (!relative || relative.includes("..")) return new NextResponse("Not found", { status: 404 });
  const bytes = await readLocalBinaryAsset(relative);
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  const ext = relative.split(".").pop()?.toLowerCase() || "";
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": mimeByExt[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
