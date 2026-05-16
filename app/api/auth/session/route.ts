import { NextRequest, NextResponse } from "next/server";

import { LAYER_ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { config } from "@/lib/config";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token =
    typeof body === "object" &&
    body !== null &&
    "access_token" in body &&
    typeof (body as { access_token?: unknown }).access_token === "string"
      ? (body as { access_token: string }).access_token.trim()
      : "";
  if (!token) {
    return NextResponse.json({ error: "access_token is required and must be non-empty" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(LAYER_ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: config.authSessionMaxAgeSeconds,
  });
  return res;
}
