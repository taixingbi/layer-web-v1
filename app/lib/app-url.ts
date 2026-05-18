import type { NextRequest } from "next/server";

import { config } from "@/lib/config";

const RESET_PASSWORD_PATH = "/auth/reset-password";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** Public web origin (no trailing slash). APP_URL env, else request Origin / forwarded headers. */
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

export function passwordResetRedirectUrl(req?: NextRequest): string {
  return `${resolvePublicAppUrl(req)}${RESET_PASSWORD_PATH}`;
}
