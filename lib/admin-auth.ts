import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "reset_admin_session";
const SESSION_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return secret;
}

function safeEqual(leftValue: string, rightValue: string) {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sign(exp: string, login: string) {
  return createHmac("sha256", sessionSecret()).update(`${exp}.${login}`).digest("hex");
}

export function adminCredentialsConfigured() {
  return Boolean(process.env.ADMIN_LOGIN && process.env.ADMIN_PASS && process.env.ADMIN_SESSION_SECRET);
}

export function verifyAdminCredentials(login: string, pass: string) {
  const expectedLogin = process.env.ADMIN_LOGIN || "";
  const expectedPass = process.env.ADMIN_PASS || "";
  if (!expectedLogin || !expectedPass || !process.env.ADMIN_SESSION_SECRET) return false;
  return safeEqual(login, expectedLogin) && safeEqual(pass, expectedPass);
}

export async function createAdminSession(login: string) {
  const store = await cookies();
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const encodedLogin = Buffer.from(login, "utf8").toString("base64url");
  store.set(COOKIE_NAME, `${exp}.${encodedLogin}.${sign(exp, login)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function isAdminAuthenticated() {
  try {
    const store = await cookies();
    const raw = store.get(COOKIE_NAME)?.value;
    if (!raw) return false;
    const [exp, encodedLogin, signature] = raw.split(".");
    if (!exp || !encodedLogin || !signature || Number(exp) <= Math.floor(Date.now() / 1000)) return false;
    const login = Buffer.from(encodedLogin, "base64url").toString("utf8");
    const configuredLogin = process.env.ADMIN_LOGIN || "";
    if (!configuredLogin || !safeEqual(login, configuredLogin)) return false;
    const expected = Buffer.from(sign(exp, login));
    const actual = Buffer.from(signature);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}
