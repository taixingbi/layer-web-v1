/**
 * Admin authorization for BFF routes (profile role or ADMIN_API_KEY).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { adminConfig } from "@/lib/admin/config";
import { gatewayJsonAuthed } from "@/lib/gateway-proxy";
import { resolveGatewayBearer } from "@/lib/gateway-auth";
import type { Profile } from "@/lib/profile";

export function isAdminProfile(profile: Profile | null | undefined): boolean {
  return (profile?.roles ?? []).some((role) => role.trim().toLowerCase() === "admin");
}

function adminApiKeyFromRequest(req: NextRequest): string | null {
  const configured = adminConfig.adminApiKey;
  if (!configured) return null;
  const h = req.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  const token = h.slice(7).trim();
  return token === configured ? token : null;
}

export type AdminAuthResult =
  | { ok: true; mode: "api_key" | "profile" }
  | { ok: false; response: NextResponse };

/** Require admin role (via gateway profile) or matching ADMIN_API_KEY bearer. */
export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  if (adminApiKeyFromRequest(req)) {
    return { ok: true, mode: "api_key" };
  }

  const token = resolveGatewayBearer(req);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }

  const upstream = await gatewayJsonAuthed("/profile", token, { method: "GET" });
  if (!upstream.ok) {
    return {
      ok: false,
      response: NextResponse.json(upstream.data, { status: upstream.status }),
    };
  }

  const profile = upstream.data as Profile;
  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
    };
  }

  return { ok: true, mode: "profile" };
}
