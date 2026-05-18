import { NextRequest, NextResponse } from "next/server";

import { applySessionCookies } from "@/lib/auth-session";
import { gatewayJson } from "@/lib/gateway-proxy";

export async function POST(req: NextRequest) {
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

  const upstream = await gatewayJson("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ access_token, password, refresh_token }),
  });

  if (!upstream.ok) {
    return NextResponse.json(upstream.data, { status: upstream.status });
  }

  const res = NextResponse.json({
    message: upstream.data.message ?? "Password updated successfully.",
    signedIn: Boolean(upstream.data.access_token),
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
