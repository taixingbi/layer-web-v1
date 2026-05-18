import { NextRequest, NextResponse } from "next/server";

import { passwordResetRedirectUrl } from "@/lib/app-url";
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

  const redirect_to = passwordResetRedirectUrl(req);

  const upstream = await gatewayJson("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email, redirect_to }),
  });

  return NextResponse.json(
    { ...upstream.data, redirect_to: upstream.data.redirect_to ?? redirect_to },
    { status: upstream.status },
  );
}
