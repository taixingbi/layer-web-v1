/**
 * Structured auth BFF logging (server-only).
 * Masks secrets in payloads; emits gateway-compatible JSON via logWebEvent.
 */

import { gatewayJson, type GatewayJsonResult } from "@/lib/gateway-proxy";
import { logWebEvent, type WebLogLevel } from "@/lib/server-log";

/**
 * Mask email local-part or username for logs (``***@example.com``).
 */
export function maskIdentifier(value: string): string {
  const s = value.trim();
  const at = s.indexOf("@");
  if (at > 0) return `***${s.slice(at)}`;
  return "***";
}

/**
 * Redact tokens and password before logging gateway request bodies.
 */
export function maskGatewayPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  if (typeof out.access_token === "string" && out.access_token) out.access_token = "...";
  if (typeof out.refresh_token === "string" && out.refresh_token) out.refresh_token = "...";
  if (typeof out.password === "string" && out.password) out.password = "[redacted]";
  return out;
}

/**
 * Log forgot-password flow step with full email and target URL (debug).
 */
export function logPasswordResetSendLink(fields: {
  email: string;
  reset_link_target?: string;
  step: string;
  level?: WebLogLevel;
  error?: string;
}): void {
  const { email, reset_link_target, step, level = "INFO", error } = fields;
  logWebEvent("password_reset_send_link", level, {
    phase: "auth",
    path: "/api/auth/forgot-password",
    method: "POST",
    email,
    ...(reset_link_target ? { reset_link_target } : {}),
    step,
    ...(error ? { error } : {}),
  });
}

/**
 * Log outgoing auth request to gateway (masked payload).
 */
export function logAuthGatewayRequest(
  apiPath: string,
  gatewayPath: string,
  gatewayPayload: Record<string, unknown>,
): void {
  logWebEvent("auth_gateway_request", "INFO", {
    phase: "auth",
    path: apiPath,
    method: "POST",
    gateway_path: gatewayPath,
    gateway_payload: maskGatewayPayload(gatewayPayload),
  });
}

/**
 * Log gateway auth response (status, masked payload, optional extra fields).
 */
export function logAuthGatewayResponse(
  event: string,
  apiPath: string,
  gatewayPath: string,
  gatewayPayload: Record<string, unknown>,
  upstream: GatewayJsonResult,
  extra: Record<string, unknown> = {},
): void {
  const level: WebLogLevel = upstream.ok ? "INFO" : "WARN";
  logWebEvent(event, level, {
    phase: "auth",
    path: apiPath,
    method: "POST",
    gateway_path: gatewayPath,
    gateway_payload: maskGatewayPayload(gatewayPayload),
    gateway_status: upstream.status,
    gateway_response: upstream.data,
    outcome: upstream.ok ? "ok" : "failed",
    ...extra,
  });
}

/**
 * Log gateway unreachable or network failure for an auth call.
 */
export function logAuthGatewayError(
  event: string,
  apiPath: string,
  gatewayPath: string,
  gatewayPayload: Record<string, unknown>,
  error: unknown,
): void {
  logWebEvent(event, "ERROR", {
    phase: "auth",
    path: apiPath,
    method: "POST",
    gateway_path: gatewayPath,
    gateway_payload: maskGatewayPayload(gatewayPayload),
    outcome: "gateway_unreachable",
    error: error instanceof Error ? error.message : String(error),
  });
}

/**
 * Call gateway with JSON body and emit request/response (or error) auth logs.
 */
export async function gatewayJsonWithAuthLog(
  event: string,
  apiPath: string,
  gatewayPath: string,
  gatewayPayload: Record<string, unknown>,
  responseExtra: Record<string, unknown> = {},
): Promise<GatewayJsonResult> {
  logAuthGatewayRequest(apiPath, gatewayPath, gatewayPayload);
  try {
    const upstream = await gatewayJson(gatewayPath, {
      method: "POST",
      body: JSON.stringify(gatewayPayload),
    });
    logAuthGatewayResponse(event, apiPath, gatewayPath, gatewayPayload, upstream, responseExtra);
    return upstream;
  } catch (err) {
    logAuthGatewayError(event, apiPath, gatewayPath, gatewayPayload, err);
    throw err;
  }
}
