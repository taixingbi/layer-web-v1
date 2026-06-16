/**
 * Admin-only guest chat audit proxy (gateway ``GET /v1/admin/guest-history``).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { resolveGatewayBearer } from "@/lib/gateway-auth";
import { gatewayPaths } from "@/lib/gateway-paths";
import { gatewayJsonAuthed } from "@/lib/gateway-proxy";
import { logWebEvent } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — recent guest chat events for admin audit UI. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const token = resolveGatewayBearer(req);
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const started = Date.now();
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit =
    limitRaw && /^\d+$/.test(limitRaw) ? Number(limitRaw) : undefined;
  const path =
    typeof limit === "number"
      ? `${gatewayPaths.admin.guestHistory}?limit=${encodeURIComponent(String(limit))}`
      : gatewayPaths.admin.guestHistory;

  const upstream = await gatewayJsonAuthed(path, token, { method: "GET" });
  const level = upstream.ok ? "INFO" : "WARN";
  logWebEvent("admin_guest_history_proxy", level, {
    phase: "admin",
    path: "/api/admin/guest-history",
    method: "GET",
    auth_mode: auth.mode,
    latency_ms: Date.now() - started,
    status: upstream.status,
  });
  return NextResponse.json(upstream.data, { status: upstream.status });
}
