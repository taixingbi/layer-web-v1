/**
 * Supabase reachability probe for admin service health (Postgres + Auth + REST).
 */

import { adminConfig } from "@/lib/admin/config";
import type { AdminServiceHealth, ServiceStatus } from "@/lib/admin/types";

function supabaseStatus(configured: boolean, ok: boolean, authOk: boolean): ServiceStatus {
  if (!configured) return "unknown";
  if (ok && authOk) return "healthy";
  if (authOk || ok) return "degraded";
  return "unhealthy";
}

/** Probe Supabase Auth + PostgREST (service role). */
export async function probeSupabaseHealth(): Promise<AdminServiceHealth> {
  const base = adminConfig.supabaseUrl.replace(/\/$/, "");
  const key = adminConfig.supabaseServiceKey;
  const configured = Boolean(base && key);

  if (!configured) {
    return {
      id: "supabase",
      name: "Supabase",
      status: "unknown",
      detail: "SUPABASE_URL or service key not configured",
      summary: "SUPABASE_URL or service key not configured",
      probeResponse: null,
    };
  }

  const headers: Record<string, string> = {
    apikey: key,
    Accept: "application/json",
  };
  if (key.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${key}`;
  }

  let authOk = false;
  let restOk = false;
  let authStatus = 0;
  let restStatus = 0;
  let detail: string | null = null;

  try {
    const [authRes, restRes] = await Promise.all([
      fetch(`${base}/auth/v1/health`, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(adminConfig.healthTimeoutMs),
        headers: { apikey: key, Accept: "application/json" },
      }),
      fetch(`${base}/rest/v1/profiles?select=id&limit=1`, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(adminConfig.healthTimeoutMs),
        headers,
      }),
    ]);
    authOk = authRes.ok;
    restOk = restRes.ok;
    authStatus = authRes.status;
    restStatus = restRes.status;
    if (!authOk && !restOk) {
      detail = `auth ${authRes.status}, rest ${restRes.status}`;
    } else if (!restOk) {
      detail = `PostgREST ${restRes.status}`;
    } else if (!authOk) {
      detail = `Auth ${authRes.status}`;
    }
  } catch (err) {
    detail = err instanceof Error ? err.message : String(err);
  }

  const status = supabaseStatus(configured, restOk, authOk);

  return {
    id: "supabase",
    name: "Supabase",
    status,
    detail,
    summary: detail,
    probeResponse: {
      health: {
        auth_ok: authOk,
        auth_status: authStatus,
        rest_ok: restOk,
        rest_status: restStatus,
        ...(detail ? { detail } : {}),
      },
      meta: { healthOk: restOk && authOk, readyOk: null },
    },
  };
}
