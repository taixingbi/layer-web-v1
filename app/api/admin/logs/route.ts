/**
 * GET /api/admin/logs — Loki query_range for admin logs page.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { fetchAdminLogs, fetchTraceLogs } from "@/lib/admin/loki";
import { logWebEvent } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SINCE_MAP: Record<string, number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const service = sp.get("service") ?? "orchestrator";
  const namespace = sp.get("namespace") ?? undefined;
  const pod = sp.get("pod") ?? undefined;
  const level = sp.get("level") ?? undefined;
  const search = sp.get("search") ?? undefined;
  const sinceKey = sp.get("since") ?? "15m";
  const sinceMs = SINCE_MAP[sinceKey] ?? SINCE_MAP["15m"];
  const trace = sp.get("trace") === "1";

  const started = Date.now();
  try {
    if (trace && search?.trim()) {
      const entries = await fetchTraceLogs({
        search: search.trim(),
        namespace,
        sinceMs: sinceMs > SINCE_MAP["1h"] ? sinceMs : SINCE_MAP["1h"],
        limit: 300,
      });
      logWebEvent("admin_logs_trace_ok", "INFO", {
        phase: "admin",
        path: "/api/admin/logs",
        search: search.slice(0, 80),
        count: entries.length,
        latency_ms: Date.now() - started,
      });
      return NextResponse.json({
        fetchedAt: new Date().toISOString(),
        source: "loki",
        query: `trace:${search}`,
        service: null,
        services: [],
        entries,
      });
    }

    const payload = await fetchAdminLogs({
      serviceId: service,
      namespace,
      pod,
      level,
      search,
      sinceMs,
    });
    logWebEvent("admin_logs_ok", "INFO", {
      phase: "admin",
      path: "/api/admin/logs",
      service,
      source: payload.source,
      count: payload.entries.length,
      latency_ms: Date.now() - started,
    });
    return NextResponse.json(payload);
  } catch (err) {
    logWebEvent("admin_logs_error", "ERROR", {
      phase: "admin",
      path: "/api/admin/logs",
      latency_ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
