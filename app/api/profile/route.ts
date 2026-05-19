/**
 * BFF profile route: GET/PATCH proxied to gateway ``/profile`` with session bearer.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { gatewayJsonAuthed } from "@/lib/gateway-proxy";
import { resolveGatewayBearer } from "@/lib/gateway-auth";
import { hasProfilePatchFields, whitelistProfilePatch } from "@/lib/profile";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Not signed in" }, { status: 401 });
}

/** Load authenticated user profile from gateway. */
export async function GET(req: NextRequest) {
  const token = resolveGatewayBearer(req);
  if (!token) return unauthorized();

  const upstream = await gatewayJsonAuthed("/profile", token, { method: "GET" });
  return NextResponse.json(upstream.data, { status: upstream.status });
}

/** Update whitelisted profile fields (username, display_name, team, group). */
export async function PATCH(req: NextRequest) {
  const token = resolveGatewayBearer(req);
  if (!token) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch = whitelistProfilePatch(body);
  if (!hasProfilePatchFields(patch)) {
    return NextResponse.json(
      { error: "At least one of username, display_name, team, group is required" },
      { status: 400 },
    );
  }

  const upstream = await gatewayJsonAuthed("/profile", token, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return NextResponse.json(upstream.data, { status: upstream.status });
}
