/**
 * Read session access token from incoming request cookies (server routes only).
 */

import type { NextRequest } from "next/server";

/** httpOnly cookie holding the gateway access token (JWT in production). */
export const LAYER_ACCESS_TOKEN_COOKIE = "layer_access_token";

/** Return trimmed access token from cookie, or empty string if absent. */
export function readLayerAccessTokenFromCookies(req: NextRequest): string {
  const raw = req.cookies.get(LAYER_ACCESS_TOKEN_COOKIE)?.value;
  if (typeof raw !== "string") return "";
  const t = raw.trim();
  return t.length > 0 ? t : "";
}
