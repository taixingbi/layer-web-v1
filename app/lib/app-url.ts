import type { NextRequest } from "next/server";

const RESET_PASSWORD_PATH = "/auth/reset-password";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** Public web origin (no trailing slash). Prefer APP_URL, then request Origin / forwarded headers. */
export function resolvePublicAppUrl(req?: NextRequest): string {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return stripTrailingSlash(fromEnv);

  if (req) {
    const origin = req.headers.get("origin")?.trim();
    if (origin) return stripTrailingSlash(origin);

    const host = req.headers.get("x-forwarded-host")?.trim() || req.headers.get("host")?.trim();
    if (host) {
      const proto = req.headers.get("x-forwarded-proto")?.trim() || "http";
      return stripTrailingSlash(`${proto}://${host}`);
    }
  }

  return "http://localhost:3000";
}

export function passwordResetRedirectUrl(req?: NextRequest): string {
  return `${resolvePublicAppUrl(req)}${RESET_PASSWORD_PATH}`;
}
