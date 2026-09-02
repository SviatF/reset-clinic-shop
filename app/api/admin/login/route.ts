import { NextResponse } from "next/server";
import { adminCredentialsConfigured, createAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!adminCredentialsConfigured()) {
      return NextResponse.json({ error: "ADMIN_LOGIN / ADMIN_PASS / ADMIN_SESSION_SECRET не налаштовані" }, { status: 503 });
    }
    const body = await request.json();
    const login = typeof body?.login === "string" ? body.login.trim() : "";
    const pass = typeof body?.pass === "string" ? body.pass : "";
    if (!verifyAdminCredentials(login, pass)) {
      return NextResponse.json({ error: "Невірний логін або пароль" }, { status: 401 });
    }
    await createAdminSession(login);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не вдалося увійти" }, { status: 500 });
  }
}
