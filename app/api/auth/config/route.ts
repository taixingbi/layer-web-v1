import { NextRequest, NextResponse } from "next/server";

import { passwordResetRedirectUrl, resolvePublicAppUrl } from "@/lib/app-url";

/** Public auth setup hints for the UI (no secrets). */
export async function GET(req: NextRequest) {
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
