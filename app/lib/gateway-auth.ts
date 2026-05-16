import type { NextRequest } from "next/server";

import { readLayerAccessTokenFromCookies } from "@/lib/auth-cookie";
import { config } from "@/lib/config";

/**
 * Bearer sent to layer-gateway-api-v1.
 * Order: inbound `Authorization` → httpOnly session cookie (`layer_access_token` from /login) →
 * `GATEWAY_BEARER_TOKEN` (stub dev / service fallback).
 */
export function resolveGatewayBearer(req: NextRequest): string {
  const h = req.headers.get("authorization");
  if (h?.toLowerCase().startsWith("bearer ")) {
    const t = h.slice(7).trim();
    if (t) return t;
  }
  const fromCookie = readLayerAccessTokenFromCookies(req);
  if (fromCookie) return fromCookie;
  return config.gatewayBearerToken.trim();
}
