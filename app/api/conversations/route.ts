/**
 * BFF: list conversations from gateway ``GET /api/conversations``.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { gatewayJsonAuthed } from "@/lib/gateway-proxy";
import { resolveGatewayBearer } from "@/lib/gateway-auth";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Not signed in" }, { status: 401 });
}

/** List authenticated user's conversations (newest first). */
export async function GET(req: NextRequest) {
  const token = resolveGatewayBearer(req);
  if (!token) return unauthorized();

  const limit = req.nextUrl.searchParams.get("limit");
  const path =
    limit && /^\d+$/.test(limit)
      ? `/api/conversations?limit=${encodeURIComponent(limit)}`
      : "/api/conversations";

  const upstream = await gatewayJsonAuthed(path, token, { method: "GET" });
  return NextResponse.json(upstream.data, { status: upstream.status });
}
