import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { jsonStoreWriteConfigured, usingLocalJsonStore, writeBinaryAsset } from "@/lib/json-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!jsonStoreWriteConfigured()) return NextResponse.json({ error: "Shop storage не налаштований" }, { status: 503 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Файл не вибрано" }, { status: 400 });
    if (!allowed.has(file.type)) return NextResponse.json({ error: "Підтримуються JPG, PNG, WebP та AVIF" }, { status: 415 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Максимальний розмір — 10 MB" }, { status: 413 });
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const relativePath = `products/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    const url = await writeBinaryAsset(relativePath, await file.arrayBuffer(), `Admin: upload product image ${file.name || "image"}`);
    return NextResponse.json({
      url,
      note: usingLocalJsonStore()
        ? "Фото збережене у persistent storage CityHost і доступне одразу."
        : "Фото записане в GitHub і стане доступним після автоматичного Vercel deploy.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
