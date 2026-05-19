/** BFF: register account; sets session cookies when Supabase returns tokens immediately. */

import { NextRequest, NextResponse } from "next/server";

import { gatewayJsonWithAuthLog, maskIdentifier } from "@/lib/auth-route-log";
import { applySessionCookies } from "@/lib/auth-session";

/** POST body: ``{ email, password, username? }``. */
export async function POST(req: NextRequest) {
  const apiPath = "/api/auth/signup";
  const gateway_path = "/auth/signup";
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

  const gateway_payload: Record<string, string> = { email, password };
  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (username) gateway_payload.username = username;

  let upstream;
  try {
    upstream = await gatewayJsonWithAuthLog(
      "auth_signup_completed",
      apiPath,
      gateway_path,
      gateway_payload,
      { email_masked: maskIdentifier(email), has_username: Boolean(username) },
    );
  } catch {
    return NextResponse.json(
      { error: "Gateway unreachable. Is layer-gateway-api running?" },
      { status: 502 },
    );
  }

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
