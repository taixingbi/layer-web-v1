/**
 * Public app URL helpers for redirects and Supabase configuration hints.
 */

import type { NextRequest } from "next/server";

import { config } from "@/lib/config";

const RESET_PASSWORD_PATH = "/auth/reset-password";

/** Remove trailing slash from a URL string. */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Public web origin without trailing slash.
 * Uses ``APP_URL``, else request ``Origin`` / ``Host`` / forwarded headers.
 */
export function resolvePublicAppUrl(req?: NextRequest): string {
  const fromEnv = config.appUrl;
  if (fromEnv) return fromEnv;

  if (req) {
    const origin = req.headers.get("origin")?.trim();
    if (origin) return stripTrailingSlash(origin);

    const host = req.headers.get("x-forwarded-host")?.trim() || req.headers.get("host")?.trim();
    if (host) {
      const proto = req.headers.get("x-forwarded-proto")?.trim() || "http";
      return stripTrailingSlash(`${proto}://${host}`);
    }
  }

  throw new Error(
    "APP_URL is not set. Add it to .env (e.g. APP_URL=http://192.168.86.179:30186) or call this from a request with Origin/host headers.",
  );
}

/** Full password-reset landing URL passed to Supabase as ``redirect_to``. */
export function passwordResetRedirectUrl(req?: NextRequest): string {
  return `${resolvePublicAppUrl(req)}${RESET_PASSWORD_PATH}`;
}
