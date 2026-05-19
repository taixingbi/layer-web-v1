import { NextRequest, NextResponse } from "next/server";

import { logWebEvent } from "@/lib/server-log";

const JWT_LIKE = /eyJ[A-Za-z0-9_-]{20,}/;

function looksLikeUnmaskedToken(value: string): boolean {
  return JWT_LIKE.test(value);
}

export async function POST(req: NextRequest) {
  let body: { landing_url_masked?: string; kind?: string };
  try {
    body = (await req.json()) as { landing_url_masked?: string; kind?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const landing_url_masked =
    typeof body.landing_url_masked === "string" ? body.landing_url_masked.trim() : "";
  if (!landing_url_masked) {
    return NextResponse.json({ error: "landing_url_masked is required" }, { status: 400 });
  }
  if (landing_url_masked.length > 2048) {
    return NextResponse.json({ error: "landing_url_masked too long" }, { status: 400 });
  }
  if (looksLikeUnmaskedToken(landing_url_masked)) {
    return NextResponse.json({ error: "landing_url_masked must not contain tokens" }, { status: 400 });
  }

  const kind = typeof body.kind === "string" ? body.kind.trim() : undefined;

  logWebEvent("password_reset_link_opened", "INFO", {
    phase: "auth",
    path: "/api/auth/reset-link-opened",
    method: "POST",
    landing_url_masked,
    ...(kind ? { kind } : {}),
  });

  return NextResponse.json({ ok: true });
}
