import { NextRequest, NextResponse } from "next/server";

import { gatewayJson } from "@/lib/gateway-proxy";

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const upstream = await gatewayJson("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  return NextResponse.json(upstream.data, { status: upstream.status });
}
