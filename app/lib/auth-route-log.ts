/**
 * Structured auth BFF logging (server-only).
 */

import { gatewayJson, type GatewayJsonResult } from "@/lib/gateway-proxy";
import { logWebEvent, type WebLogLevel } from "@/lib/server-log";

export function maskIdentifier(value: string): string {
  const s = value.trim();
  const at = s.indexOf("@");
  if (at > 0) return `***${s.slice(at)}`;
  return "***";
}

/** Redact secrets before logging gateway request bodies. */
export function maskGatewayPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  if (typeof out.access_token === "string" && out.access_token) out.access_token = "...";
  if (typeof out.refresh_token === "string" && out.refresh_token) out.refresh_token = "...";
  if (typeof out.password === "string" && out.password) out.password = "[redacted]";
  return out;
}

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
