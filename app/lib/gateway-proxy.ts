/**
 * Server-side HTTP client for layer-gateway-api (JSON request/response).
 */

import { config } from "@/lib/config";

/** Parsed JSON response from a gateway ``fetch`` call. */
export type GatewayJsonResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
};

/**
 * ``fetch`` gateway path and parse JSON body (or wrap non-JSON as ``detail``).
 */
export async function gatewayJson(
  path: string,
  init?: RequestInit,
): Promise<GatewayJsonResult> {
  const url = `${config.gatewayBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { detail: text };
    }
  }
  return { ok: res.ok, status: res.status, data };
}

/**
 * ``gatewayJson`` with ``Authorization: Bearer`` for authenticated gateway routes.
 */
export async function gatewayJsonAuthed(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<GatewayJsonResult> {
  return gatewayJson(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
}
