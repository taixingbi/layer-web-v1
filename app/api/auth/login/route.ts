/** BFF: login with identifier (email or username) + password; sets httpOnly session cookies. */

import { NextRequest, NextResponse } from "next/server";

import { gatewayJsonWithAuthLog, logAuthGatewayError, maskIdentifier } from "@/lib/auth-route-log";
import { applySessionCookies } from "@/lib/auth-session";
import { gatewayPaths } from "@/lib/gateway-paths";

/** POST body: ``{ identifier, password }`` (or legacy ``email``). */
export async function POST(req: NextRequest) {
  const apiPath = "/api/auth/login";
  const gateway_path = gatewayPaths.auth.login;
  let body: { email?: string; identifier?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; identifier?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const identifier =
    (typeof body.identifier === "string" ? body.identifier.trim() : "") ||
    (typeof body.email === "string" ? body.email.trim() : "");
  const password = typeof body.password === "string" ? body.password : "";
  if (!identifier || !password) {
    return NextResponse.json({ error: "identifier and password are required" }, { status: 400 });
  }

  const gateway_payload = { identifier, password };

  let upstream;
  try {
    upstream = await gatewayJsonWithAuthLog(
      "auth_login_completed",
      apiPath,
      gateway_path,
      gateway_payload,
      { identifier_masked: maskIdentifier(identifier) },
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
  if (!accessToken || typeof accessToken !== "string" || !accessToken.trim()) {
    logAuthGatewayError(
      "auth_login_completed",
      apiPath,
      gateway_path,
      gateway_payload,
      new Error("no_access_token"),
    );
    return NextResponse.json(
      { signedIn: false, error: "Login succeeded but no access token was returned." },
      { status: 401 },
    );
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
