import { NextResponse } from "next/server";

/** Public flags for the login UI (no secrets). */
export async function GET() {
  const demo =
    Boolean(process.env.AUTH_DEMO_EMAIL?.trim()) &&
    Boolean(process.env.AUTH_DEMO_PASSWORD?.trim()) &&
    Boolean(process.env.AUTH_DEMO_ACCESS_TOKEN?.trim());
  return NextResponse.json({ demoLogin: demo });
}
