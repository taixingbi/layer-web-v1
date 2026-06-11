/**
 * Admin dashboard aggregate (health, Prometheus KPIs, Supabase analytics).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { buildAdminOverview } from "@/lib/admin/overview";
import { logWebEvent } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — normalized HuntAI platform overview (admin only). */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const started = Date.now();
  try {
    const payload = await buildAdminOverview();
    logWebEvent("admin_overview_ok", "INFO", {
      phase: "admin",
      path: "/api/admin/overview",
      method: "GET",
      auth_mode: auth.mode,
      latency_ms: Date.now() - started,
      prometheus: payload.sources.prometheus,
      supabase: payload.sources.supabase,
    });
    return NextResponse.json(payload);
  } catch (err) {
    logWebEvent("admin_overview_error", "ERROR", {
      phase: "admin",
      path: "/api/admin/overview",
      method: "GET",
      latency_ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to build admin overview" }, { status: 500 });
  }
}
