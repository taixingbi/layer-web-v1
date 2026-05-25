/** BFF: forgot password — logs email + reset target, proxies to gateway Supabase reset. */

import { NextRequest, NextResponse } from "next/server";

import {
  logAuthGatewayError,
  logAuthGatewayRequest,
  logAuthGatewayResponse,
  logPasswordResetSendLink,
} from "@/lib/auth-route-log";
import { passwordResetRedirectUrl } from "@/lib/app-url";
import { gatewayPaths } from "@/lib/gateway-paths";
import { gatewayJson } from "@/lib/gateway-proxy";

/** POST body: ``{ email }`` → gateway ``/v1/auth/forgot-password`` with ``redirect_to``. */
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

  logPasswordResetSendLink({ email, step: "button_clicked" });

  let redirect_to: string;
  try {
    redirect_to = passwordResetRedirectUrl(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logPasswordResetSendLink({
      email,
      step: "resolve_redirect_failed",
      level: "ERROR",
      error: message,
    });
    return NextResponse.json(
      {
        error:
          "APP_URL is not configured on the web server. Set APP_URL (e.g. http://192.168.86.179:30186).",
      },
      { status: 500 },
    );
  }

  logPasswordResetSendLink({
    email,
    reset_link_target: redirect_to,
    step: "ready_to_send",
  });

  const gateway_path = gatewayPaths.auth.forgotPassword;
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
    logPasswordResetSendLink({
      email,
      reset_link_target: redirect_to,
      step: "gateway_unreachable",
      level: "ERROR",
      error: err instanceof Error ? err.message : String(err),
    });
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
      email,
      reset_link_target: resolved_redirect_to,
      outcome: upstream.ok ? "sent" : "failed",
    },
  );

  logPasswordResetSendLink({
    email,
    reset_link_target: resolved_redirect_to,
    step: upstream.ok ? "email_triggered" : "gateway_rejected",
    level: upstream.ok ? "INFO" : "WARN",
  });

  const responseBody: Record<string, unknown> = {
    message:
      typeof upstream.data.message === "string"
        ? upstream.data.message
        : "If an account exists for that email, a password reset link was sent.",
  };

  if (process.env.NODE_ENV !== "production") {
    responseBody.redirect_to = upstream.data.redirect_to ?? redirect_to;
  }

  return NextResponse.json(responseBody, { status: upstream.status });
}
