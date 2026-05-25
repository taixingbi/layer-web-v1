/** BFF: complete password reset from email link tokens; may sign user in via cookies. */

import { NextRequest, NextResponse } from "next/server";

import { gatewayJsonWithAuthLog } from "@/lib/auth-route-log";
import { gatewayPaths } from "@/lib/gateway-paths";
import { applySessionCookies } from "@/lib/auth-session";

/** POST body: ``{ access_token, password, refresh_token? }`` (tokens from URL hash). */
export async function POST(req: NextRequest) {
  const apiPath = "/api/auth/reset-password";
  const gateway_path = gatewayPaths.auth.resetPassword;
  let body: { access_token?: string; refresh_token?: string; password?: string };
  try {
    body = (await req.json()) as {
      access_token?: string;
      refresh_token?: string;
      password?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const access_token = typeof body.access_token === "string" ? body.access_token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const refresh_token =
    typeof body.refresh_token === "string" && body.refresh_token.trim()
      ? body.refresh_token.trim()
      : undefined;

  if (!access_token || !password) {
    return NextResponse.json({ error: "access_token and password are required" }, { status: 400 });
  }

  const gateway_payload: Record<string, string> = { access_token, password };
  if (refresh_token) gateway_payload.refresh_token = refresh_token;

  let upstream;
  try {
    upstream = await gatewayJsonWithAuthLog(
      "auth_reset_password_completed",
      apiPath,
      gateway_path,
      gateway_payload,
      { has_refresh_token: Boolean(refresh_token) },
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

  const signedIn = Boolean(upstream.data.access_token);
  const res = NextResponse.json({
    message: upstream.data.message ?? "Password updated successfully.",
    signedIn,
  });
  if (upstream.data.access_token) {
    applySessionCookies(res, {
      access_token: upstream.data.access_token as string,
      refresh_token: upstream.data.refresh_token as string | undefined,
      expires_in: upstream.data.expires_in as number | undefined,
    });
  }
  return res;
}
