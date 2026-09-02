import { NextResponse } from "next/server";
import { createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";
    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ error: "Невірний пароль" }, { status: 401 });
    }
    await createAdminSession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не вдалося увійти" }, { status: 500 });
  }
}
