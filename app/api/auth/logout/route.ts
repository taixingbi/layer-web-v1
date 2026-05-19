import { NextResponse } from "next/server";

import { clearSessionCookies } from "@/lib/auth-session";
import { logWebEvent } from "@/lib/server-log";

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
