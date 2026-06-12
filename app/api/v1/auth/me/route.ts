/**
 * Session probe: whether an httpOnly access-token cookie is present (no token in response).
 */

import { NextRequest, NextResponse } from "next/server";

import { readLayerAccessTokenFromCookies } from "@/lib/auth-cookie";
import { config } from "@/lib/config";
import { logWebEvent } from "@/lib/server-log";
import { webApiPaths } from "@/lib/web-api-paths";

/**
 * Whether an httpOnly session cookie is present (does not expose the token).
 * GET — returns ``{ signedIn: boolean, guestChatAllowed: boolean }``.
 */
export async function GET(req: NextRequest) {
  const hasCookie = Boolean(readLayerAccessTokenFromCookies(req));
  const guestChatAllowed =
    config.chatAllowGuest && Boolean(config.guestChatBearerToken);
  logWebEvent("auth_session_checked", "INFO", {
    phase: "auth",
    path: webApiPaths.auth.me,
    method: "GET",
    signed_in: hasCookie,
    guest_chat_allowed: guestChatAllowed,
  });
  return NextResponse.json({ signedIn: hasCookie, guestChatAllowed });
}
