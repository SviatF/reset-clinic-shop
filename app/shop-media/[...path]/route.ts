import { serveShopMedia } from "@/lib/shop-media-serve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };
export async function GET(_: Request, context: Context) {
  const { path } = await context.params;
  return serveShopMedia(path || []);
}
export async function HEAD(_: Request, context: Context) {
  const { path } = await context.params;
  return serveShopMedia(path || [], true);
}
