/**
 * Public auth configuration for the UI (Site URL, reset redirect; no secrets).
 */

import { NextRequest, NextResponse } from "next/server";

import { passwordResetRedirectUrl, resolvePublicAppUrl } from "@/lib/app-url";

/**
 * Public auth setup hints for the UI (no secrets).
 * GET — Site URL and redirect URL for Supabase Dashboard configuration.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({});
  }

  const siteUrl = resolvePublicAppUrl(req);
  const resetPasswordRedirectUrl = passwordResetRedirectUrl(req);
  return NextResponse.json({
    siteUrl,
    resetPasswordRedirectUrl,
    supabaseSetup: {
      siteUrl,
      redirectUrls: [resetPasswordRedirectUrl],
      note:
        "In Supabase Dashboard → Authentication → URL configuration, set Site URL and add the redirect URL exactly. Then request a new reset email.",
    },
  });
}
