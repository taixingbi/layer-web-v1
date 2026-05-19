/** BFF: clear httpOnly session cookies. */

import { NextResponse } from "next/server";

import { clearSessionCookies } from "@/lib/auth-session";
import { logWebEvent } from "@/lib/server-log";

/** Clear ``layer_access_token`` and ``layer_refresh_token`` cookies. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  logWebEvent("auth_logout_completed", "INFO", {
    phase: "auth",
    path: "/api/auth/logout",
    method: "POST",
    outcome: "ok",
  });
  return res;
}
