import { NextRequest, NextResponse } from "next/server";

import { LAYER_ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { config } from "@/lib/config";

export async function POST(req: NextRequest) {
  const emailEnv = process.env.AUTH_DEMO_EMAIL?.trim() ?? "";
  const passEnv = process.env.AUTH_DEMO_PASSWORD?.trim() ?? "";
  const tokenEnv = process.env.AUTH_DEMO_ACCESS_TOKEN?.trim() ?? "";
  if (!emailEnv || !passEnv || !tokenEnv) {
    return NextResponse.json({ error: "Demo login is not configured" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";
  const password =
    typeof body === "object" &&
    body !== null &&
    "password" in body &&
    typeof (body as { password?: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";

  if (email !== emailEnv || password !== passEnv) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(LAYER_ACCESS_TOKEN_COOKIE, tokenEnv, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: config.authSessionMaxAgeSeconds,
  });
  return res;
}
