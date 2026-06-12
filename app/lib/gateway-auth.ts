/**
 * Resolve gateway bearer token from incoming BFF requests (header or session cookie).
 */

import type { NextRequest } from "next/server";

import { readLayerAccessTokenFromCookies } from "@/lib/auth-cookie";
import { config } from "@/lib/config";

export type ResolveGatewayBearerOptions = {
  /** When true and ``CHAT_ALLOW_GUEST`` is set, use server ``GUEST_CHAT_BEARER_TOKEN``. */
  allowGuestFallback?: boolean;
};

/**
 * Bearer sent to layer-gateway-api-v1.
 * Order: inbound `Authorization` → httpOnly session cookie (`layer_access_token`)
 * → optional guest service token when ``allowGuestFallback``.
 */
export function resolveGatewayBearer(
  req: NextRequest,
  options?: ResolveGatewayBearerOptions,
): string {
  const h = req.headers.get("authorization");
  if (h?.toLowerCase().startsWith("bearer ")) {
    const t = h.slice(7).trim();
    if (t) return t;
  }
  const fromCookie = readLayerAccessTokenFromCookies(req);
  if (fromCookie) return fromCookie;
  if (options?.allowGuestFallback && config.chatAllowGuest) {
    const guest = config.guestChatBearerToken;
    if (guest) return guest;
  }
  return "";
}
