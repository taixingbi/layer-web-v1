import { NextResponse } from "next/server";

/** Public flags for the login UI (no secrets). */
export async function GET() {
  return NextResponse.json({});
}
