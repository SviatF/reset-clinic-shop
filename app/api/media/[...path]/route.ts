import { serveShopMedia } from "@/lib/shop-media-serve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dynamic R2 media route independent of Cloudflare's static asset fallback.
 * Old /shop-media URLs are resolved here by SmartProductImage. */
type Context = { params: Promise<{ path: string[] }> };
export async function GET(_: Request, context: Context) {
  const { path } = await context.params;
  return serveShopMedia(path || []);
}
export async function HEAD(_: Request, context: Context) {
  const { path } = await context.params;
  return serveShopMedia(path || [], true);
}
