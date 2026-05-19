/**
 * Resolve gateway bearer token from incoming BFF requests (header or session cookie).
 */

import type { NextRequest } from "next/server";

import { readLayerAccessTokenFromCookies } from "@/lib/auth-cookie";

/**
 * Bearer sent to layer-gateway-api-v1.
 * Order: inbound `Authorization` → httpOnly session cookie (`layer_access_token`).
 */
export function resolveGatewayBearer(req: NextRequest): string {
  const h = req.headers.get("authorization");
  if (h?.toLowerCase().startsWith("bearer ")) {
    const t = h.slice(7).trim();
    if (t) return t;
  }
  return readLayerAccessTokenFromCookies(req);
}
