/**
 * httpOnly session cookies for gateway access/refresh tokens (BFF only).
 */

import type { NextResponse } from "next/server";

import { LAYER_ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { config } from "@/lib/config";

/** httpOnly cookie holding the gateway refresh token (optional). */
export const LAYER_REFRESH_TOKEN_COOKIE = "layer_refresh_token";

type SessionTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expires_in?: number | null;
};

/** Whether session cookies should use ``Secure`` (HTTPS or explicit COOKIE_SECURE). */
function cookieSecure(): boolean {
  const raw = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  // LAN / Docker over HTTP: NODE_ENV=production but cookies must not be Secure-only.
  const appUrl = process.env.APP_URL?.trim() || "";
  return appUrl.startsWith("https://");
}

/** Shared cookie attributes for session tokens. */
function cookieBase() {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
  };
}

/** Set access (and optional refresh) cookies on a NextResponse after login/signup/reset. */
export function applySessionCookies(res: NextResponse, tokens: SessionTokens): void {
  const access = typeof tokens.access_token === "string" ? tokens.access_token.trim() : "";
  if (access) {
    const maxAge =
      typeof tokens.expires_in === "number" && tokens.expires_in > 0
        ? tokens.expires_in
        : config.authSessionMaxAgeSeconds;
    res.cookies.set(LAYER_ACCESS_TOKEN_COOKIE, access, {
      ...cookieBase(),
      maxAge,
    });
  }

  const refresh = typeof tokens.refresh_token === "string" ? tokens.refresh_token.trim() : "";
  if (refresh) {
    res.cookies.set(LAYER_REFRESH_TOKEN_COOKIE, refresh, {
      ...cookieBase(),
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

/** Clear session cookies on logout. */
export function clearSessionCookies(res: NextResponse): void {
  const base = { ...cookieBase(), maxAge: 0 };
  res.cookies.set(LAYER_ACCESS_TOKEN_COOKIE, "", base);
  res.cookies.set(LAYER_REFRESH_TOKEN_COOKIE, "", base);
}
