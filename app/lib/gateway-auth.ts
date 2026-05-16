import type { NextRequest } from "next/server";

import { config } from "@/lib/config";

/**
 * Bearer sent to layer-gateway-api-v1.
 * Prefers the inbound client `Authorization` (per-user access JWT in production); falls back to
 * `GATEWAY_BEARER_TOKEN` for local stub dev or service accounts when the browser sends no bearer.
 */
export function resolveGatewayBearer(req: NextRequest): string {
  const h = req.headers.get("authorization");
  if (h?.toLowerCase().startsWith("bearer ")) {
    const t = h.slice(7).trim();
    if (t) return t;
  }
  return config.gatewayBearerToken.trim();
}
