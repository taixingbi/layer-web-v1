import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { buildRouterOverview } from "@/lib/train/router-overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — router training control-plane metrics from layer-router-train-v1 eval results. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const payload = await buildRouterOverview();
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load router overview" },
      { status: 500 },
    );
  }
}
