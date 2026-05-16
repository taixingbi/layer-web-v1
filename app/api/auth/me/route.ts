import { NextRequest, NextResponse } from "next/server";

import { readLayerAccessTokenFromCookies } from "@/lib/auth-cookie";

/** Whether an httpOnly session cookie is present (does not expose the token). */
export async function GET(req: NextRequest) {
  const hasCookie = Boolean(readLayerAccessTokenFromCookies(req));
  return NextResponse.json({ signedIn: hasCookie });
}
