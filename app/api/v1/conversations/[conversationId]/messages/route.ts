/**
 * BFF: load messages for one conversation from gateway.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { gatewayJsonAuthed } from "@/lib/gateway-proxy";
import { resolveGatewayBearer } from "@/lib/gateway-auth";
import { gatewayPaths } from "@/lib/gateway-paths";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Not signed in" }, { status: 401 });
}

/** Return messages for an owned conversation. */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  const token = resolveGatewayBearer(req);
  if (!token) return unauthorized();

  const { conversationId } = await context.params;
  const id = conversationId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }

  const upstream = await gatewayJsonAuthed(gatewayPaths.conversationMessages(id), token, {
    method: "GET",
  });
  return NextResponse.json(upstream.data, { status: upstream.status });
}
