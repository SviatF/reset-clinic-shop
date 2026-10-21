import { NextResponse } from "next/server";
import { readLocalBinaryAsset, usingLocalJsonStore, usingCloudflareStore } from "@/lib/json-store";
import { shopMediaBucket } from "@/lib/r2-media";

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
  if (!usingLocalJsonStore() && !usingCloudflareStore() && !shopMediaBucket()) return new NextResponse("Not found", { status: 404 });
  const { path } = await context.params;
  const relative = (path || []).join("/");
  if (!relative || relative.includes("..")) return new NextResponse("Not found", { status: 404 });
  const bucket=shopMediaBucket();
  if(bucket){
    const stored=await bucket.get(relative);
    if(stored){
      const headers=new Headers({"Cache-Control":"public, max-age=31536000, immutable","X-Content-Type-Options":"nosniff"});
      stored.writeHttpMetadata(headers);
      return new Response(stored.body,{headers});
    }
  }
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
