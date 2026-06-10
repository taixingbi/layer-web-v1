/**
 * GET /api/admin/argocd/apps — Argo CD application list for deploy page.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { fetchArgoCdOverview } from "@/lib/admin/argocd";
import { logWebEvent } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const started = Date.now();
  try {
    const payload = await fetchArgoCdOverview();
    logWebEvent("admin_argocd_ok", "INFO", {
      phase: "admin",
      path: "/api/admin/argocd/apps",
      source: payload.source,
      count: payload.apps.length,
      latency_ms: Date.now() - started,
    });
    return NextResponse.json(payload);
  } catch (err) {
    logWebEvent("admin_argocd_error", "ERROR", {
      phase: "admin",
      path: "/api/admin/argocd/apps",
      latency_ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to fetch Argo CD apps" }, { status: 500 });
  }
}
