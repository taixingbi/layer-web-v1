import { NextRequest, NextResponse } from "next/server";

import { applySessionCookies } from "@/lib/auth-session";
import { gatewayJson } from "@/lib/gateway-proxy";

export async function POST(req: NextRequest) {
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

  const upstream = await gatewayJson("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });

  if (!upstream.ok) {
    return NextResponse.json(upstream.data, { status: upstream.status });
  }

  const accessToken = upstream.data.access_token as string | null | undefined;
  if (!accessToken || typeof accessToken !== "string" || !accessToken.trim()) {
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
