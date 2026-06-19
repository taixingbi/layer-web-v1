/**
 * Resolve the visitor IP behind Cloudflare / reverse proxies for BFF → gateway forwarding.
 */

import type { NextRequest } from "next/server";

const IP_LIKE = /^[0-9a-fA-F:.]{2,45}$/;

function normalizeIp(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const unbracketed =
    trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1).trim() : trimmed;
  if (!IP_LIKE.test(unbracketed)) return null;
  return unbracketed;
}

/** Read client IP from trusted proxy headers (Cloudflare tunnel, ingress, etc.). */
export function resolveClientIpFromHeaders(headers: Headers): string | null {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("true-client-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
    headers.get("x-real-ip"),
  ];
  for (const candidate of candidates) {
    const ip = normalizeIp(candidate);
    if (ip) return ip;
  }
  return null;
}

/** Resolve visitor IP from an inbound Next.js request. */
export function resolveClientIp(req: NextRequest): string | null {
  return resolveClientIpFromHeaders(req.headers);
}

/** Gateway audit headers: single-hop X-Forwarded-For for layer-gateway-api client_ip. */
export function gatewayClientIpHeaders(req: NextRequest): Record<string, string> {
  const ip = resolveClientIp(req);
  return ip ? { "X-Forwarded-For": ip } : {};
}
