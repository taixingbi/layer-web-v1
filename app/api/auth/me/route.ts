import { NextRequest, NextResponse } from "next/server";

import { readLayerAccessTokenFromCookies } from "@/lib/auth-cookie";
import { logWebEvent } from "@/lib/server-log";

/** Whether an httpOnly session cookie is present (does not expose the token). */
export async function GET(req: NextRequest) {
  const hasCookie = Boolean(readLayerAccessTokenFromCookies(req));
  logWebEvent("auth_session_checked", "INFO", {
    phase: "auth",
    path: "/api/auth/me",
    method: "GET",
    signed_in: hasCookie,
  });
  return NextResponse.json({ signedIn: hasCookie });
}
