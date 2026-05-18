import { NextRequest, NextResponse } from "next/server";

import { applySessionCookies } from "@/lib/auth-session";
import { gatewayJson } from "@/lib/gateway-proxy";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; username?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string; username?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const payload: Record<string, string> = { email, password };
  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (username) payload.username = username;

  const upstream = await gatewayJson("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    return NextResponse.json(upstream.data, { status: upstream.status });
  }

  const accessToken = upstream.data.access_token as string | null | undefined;
  const emailConfirmationRequired = Boolean(upstream.data.email_confirmation_required);

  if (!accessToken?.trim()) {
    return NextResponse.json({
      signedIn: false,
      email_confirmation_required: emailConfirmationRequired,
      user: upstream.data.user ?? null,
    });
  }

  const res = NextResponse.json({
    signedIn: true,
    user: upstream.data.user ?? null,
  });
  applySessionCookies(res, {
    access_token: accessToken,
    refresh_token: upstream.data.refresh_token as string | null | undefined,
    expires_in: upstream.data.expires_in as number | null | undefined,
  });
  return res;
}
