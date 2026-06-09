/**
 * Lightweight admin gate for /train pages (same auth as admin overview).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — { ok: true } when caller has admin access. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, mode: auth.mode });
}
