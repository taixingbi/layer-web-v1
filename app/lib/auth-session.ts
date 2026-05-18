import type { NextResponse } from "next/server";

import { LAYER_ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { config } from "@/lib/config";

export const LAYER_REFRESH_TOKEN_COOKIE = "layer_refresh_token";

type SessionTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expires_in?: number | null;
};

function cookieBase() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

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

export function clearSessionCookies(res: NextResponse): void {
  const base = { ...cookieBase(), maxAge: 0 };
  res.cookies.set(LAYER_ACCESS_TOKEN_COOKIE, "", base);
  res.cookies.set(LAYER_REFRESH_TOKEN_COOKIE, "", base);
}
