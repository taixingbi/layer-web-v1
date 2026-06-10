/**
 * GET /api/admin/argocd/apps/[name] — single Argo CD application detail.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { fetchArgoCdApp } from "@/lib/admin/argocd";
import { logWebEvent } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ name: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { name } = await params;
  const started = Date.now();
  try {
    const app = await fetchArgoCdApp(decodeURIComponent(name));
    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    logWebEvent("admin_argocd_detail_ok", "INFO", {
      phase: "admin",
      path: `/api/admin/argocd/apps/${name}`,
      latency_ms: Date.now() - started,
    });
    return NextResponse.json(app);
  } catch (err) {
    logWebEvent("admin_argocd_detail_error", "ERROR", {
      phase: "admin",
      path: `/api/admin/argocd/apps/${name}`,
      latency_ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to fetch application" }, { status: 500 });
  }
}
