import { NextRequest, NextResponse } from "next/server";

import {
  logAuthGatewayError,
  logAuthGatewayRequest,
  logAuthGatewayResponse,
  maskIdentifier,
} from "@/lib/auth-route-log";
import { passwordResetRedirectUrl } from "@/lib/app-url";
import { gatewayJson } from "@/lib/gateway-proxy";

export async function POST(req: NextRequest) {
  const apiPath = "/api/auth/forgot-password";
  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const redirect_to = passwordResetRedirectUrl(req);
  const gateway_path = "/auth/forgot-password";
  const gateway_payload = { email, redirect_to };

  logAuthGatewayRequest(apiPath, gateway_path, gateway_payload);

  let upstream;
  try {
    upstream = await gatewayJson(gateway_path, {
      method: "POST",
      body: JSON.stringify(gateway_payload),
    });
  } catch (err) {
    logAuthGatewayError("password_reset_requested", apiPath, gateway_path, gateway_payload, err);
    return NextResponse.json(
      { error: "Gateway unreachable. Is layer-gateway-api running?" },
      { status: 502 },
    );
  }

  const resolved_redirect_to =
    typeof upstream.data.redirect_to === "string" ? upstream.data.redirect_to : redirect_to;

  logAuthGatewayResponse(
    "password_reset_requested",
    apiPath,
    gateway_path,
    gateway_payload,
    upstream,
    {
      redirect_to: resolved_redirect_to,
      email_masked: maskIdentifier(email),
      outcome: upstream.ok ? "sent" : "failed",
    },
  );

  return NextResponse.json(
    { ...upstream.data, redirect_to: upstream.data.redirect_to ?? redirect_to },
    { status: upstream.status },
  );
}
