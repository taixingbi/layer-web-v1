/**
 * Admin gold JSONL viewer (GitHub raw layer-rag-evaluation-v1).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { fetchGoldRowsPage, parseGoldRowsQueryParams } from "@/lib/admin/rag-gold-rows";
import { logWebEvent } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — paginated gold eval rows for admin table UI. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const started = Date.now();
  const sp = req.nextUrl.searchParams;
  const parsed = parseGoldRowsQueryParams({
    env: sp.get("env"),
    file: sp.get("file"),
    offset: sp.get("offset"),
    limit: sp.get("limit"),
    q: sp.get("q"),
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  try {
    const payload = await fetchGoldRowsPage({
      env: parsed.env,
      file: parsed.file,
      offset: parsed.offset,
      limit: parsed.limit,
      query: parsed.query || undefined,
    });
    logWebEvent("admin_rag_gold_ok", "INFO", {
      phase: "admin",
      path: "/api/admin/rag-gold",
      method: "GET",
      auth_mode: auth.mode,
      latency_ms: Date.now() - started,
      env: parsed.env,
      file: parsed.file,
      total: payload.total,
    });
    return NextResponse.json(payload);
  } catch (err) {
    logWebEvent("admin_rag_gold_error", "WARN", {
      phase: "admin",
      path: "/api/admin/rag-gold",
      method: "GET",
      auth_mode: auth.mode,
      latency_ms: Date.now() - started,
      env: parsed.env,
      file: parsed.file,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to load gold dataset from GitHub" }, { status: 502 });
  }
}
