import { NextRequest, NextResponse } from "next/server";

import { applySessionCookies } from "@/lib/auth-session";
import { gatewayJson } from "@/lib/gateway-proxy";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const upstream = await gatewayJson("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!upstream.ok) {
    return NextResponse.json(upstream.data, { status: upstream.status });
  }

  const res = NextResponse.json({
    signedIn: Boolean(upstream.data.access_token),
    user: upstream.data.user ?? null,
  });
  applySessionCookies(res, {
    access_token: upstream.data.access_token as string | null | undefined,
    refresh_token: upstream.data.refresh_token as string | null | undefined,
    expires_in: upstream.data.expires_in as number | null | undefined,
  });
  return res;
}
