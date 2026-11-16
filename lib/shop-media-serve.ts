import { readLocalBinaryAsset, usingCloudflareStore, usingLocalJsonStore } from "@/lib/json-store";
import { productMime, shopMediaBucket } from "@/lib/r2-media";

/** Serve authenticated R2-backed catalog media through a stable Worker route.
 * Do not cache missing images or pin mutable object keys for a year. */
export async function serveShopMedia(path: string[], head = false): Promise<Response> {
  const relative = path.join("/");
  if (!relative || relative.length > 650 ||
      path.some(part => !part || part === "." || part === ".." || part.includes("\\") || part.includes("\0")) ||
      !/^[-\w\u0400-\u04ff/().%+ ]+\.(?:png|jpe?g|webp|avif)$/i.test(relative))
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  const bucket = shopMediaBucket();
  if (usingCloudflareStore() && (!bucket || process.env.SHOP_MEDIA_BACKEND !== "r2"))
    return new Response("Media storage unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });

  try {
    if (bucket) {
      const stored = await bucket.get(relative);
      if (stored) {
        const headers = new Headers({
          "Cache-Control": "public, max-age=300, must-revalidate",
          "X-Content-Type-Options": "nosniff",
          "Content-Type": productMime(relative),
        });
        stored.writeHttpMetadata(headers);
        // Always use an image MIME derived from the validated extension.
        headers.set("Content-Type", productMime(relative));
        return new Response(head ? null : stored.body, { status: 200, headers });
      }
    }
    if (usingLocalJsonStore()) {
      const bytes = await readLocalBinaryAsset(relative);
      if (bytes) return new Response(head ? null : bytes, {
        status: 200,
        headers: {
          "Content-Type": productMime(relative),
          "Cache-Control": "public, max-age=300, must-revalidate",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return new Response("Media not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("R2 media delivery failed", relative, error);
    return new Response("Media unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
