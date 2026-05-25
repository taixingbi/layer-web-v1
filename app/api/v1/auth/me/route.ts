/**
 * Session probe: whether an httpOnly access-token cookie is present (no token in response).
 */

import { NextRequest, NextResponse } from "next/server";

import { readLayerAccessTokenFromCookies } from "@/lib/auth-cookie";
import { logWebEvent } from "@/lib/server-log";
import { webApiPaths } from "@/lib/web-api-paths";

/**
 * Whether an httpOnly session cookie is present (does not expose the token).
 * GET — returns ``{ signedIn: boolean }``.
 */
export async function GET(req: NextRequest) {
  const hasCookie = Boolean(readLayerAccessTokenFromCookies(req));
  logWebEvent("auth_session_checked", "INFO", {
    phase: "auth",
    path: webApiPaths.auth.me,
    method: "GET",
    signed_in: hasCookie,
  });
  return NextResponse.json({ signedIn: hasCookie });
}
