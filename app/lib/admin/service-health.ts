/**
 * Parallel /health (+ optional /ready) probes for admin service health cards.
 */

import { adminConfig, adminServiceTargets, type AdminServiceTarget } from "@/lib/admin/config";
import { probeRedisHealth } from "@/lib/admin/redis-health";
import {
  summarizeServiceProbe,
} from "@/lib/admin/service-health-summary";
import { probeSupabaseHealth } from "@/lib/admin/supabase-health";
import type { AdminServiceHealth, AdminServiceProbeResponse, ServiceStatus } from "@/lib/admin/types";

type FetchJsonResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
};

type ProbeResult = {
  healthOk: boolean;
  readyOk: boolean | null;
  version: string | null;
  detail: string | null;
  healthBody: Record<string, unknown> | null;
  readyBody: Record<string, unknown> | null;
  summary: string | null;
  probeResponse: AdminServiceProbeResponse | null;
};

async function fetchJson(url: string, timeoutMs: number): Promise<FetchJsonResult> {
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    if (text) {
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        data = { raw: text.slice(0, 500) };
      }
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { error: err instanceof Error ? err.message : String(err) },
    };
  }
}

function versionFromPayload(data: Record<string, unknown>): string | null {
  for (const key of ["version", "app_version"]) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function statusFromProbe(probe: ProbeResult, configured: boolean): ServiceStatus {
  if (!configured) return "unknown";
  if (probe.healthOk && (probe.readyOk === null || probe.readyOk)) return "healthy";
  if (probe.healthOk && probe.readyOk === false) return "degraded";
  return "unhealthy";
}

function healthDetailFromBody(data: Record<string, unknown>): string | null {
  if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
  if (typeof data.detail === "string" && data.detail.trim()) return data.detail.trim();
  return null;
}

async function probeService(target: AdminServiceTarget): Promise<ProbeResult> {
  const base = target.baseUrl.replace(/\/$/, "");
  const timeoutMs = target.timeoutMs ?? adminConfig.healthTimeoutMs;
  if (!base) {
    return {
      healthOk: false,
      readyOk: null,
      version: null,
      detail: "URL not configured",
      healthBody: null,
      readyBody: null,
      summary: "URL not configured",
      probeResponse: null,
    };
  }

  const healthPath = target.healthPath ?? "/health";
  const health = await fetchJson(`${base}${healthPath}`, timeoutMs);
  let readyOk: boolean | null = null;
  let readyBody: Record<string, unknown> | null = null;
  let readyStatus = 0;
  if (target.readyPath) {
    const ready = await fetchJson(`${base}${target.readyPath}`, timeoutMs);
    readyOk = ready.ok;
    readyBody = ready.data;
    readyStatus = ready.status;
  }

  let version = versionFromPayload(health.data);
  if (!version) {
    const versionRes = await fetchJson(`${base}/version`, timeoutMs);
    if (versionRes.ok) {
      version = versionFromPayload(versionRes.data);
    }
  }

  const detail = healthDetailFromBody(health.data);
  const summary = summarizeServiceProbe({
    healthOk: health.ok,
    readyOk,
    healthDetail: detail,
    healthBody: health.data,
    readyBody,
  });

  const probeResponse: AdminServiceProbeResponse = {
    health: { ...health.data, _http_status: health.status },
    ...(readyBody
      ? { ready: { ...readyBody, _http_status: readyStatus || (readyOk ? 200 : 503) } }
      : {}),
    meta: { healthOk: health.ok, readyOk },
  };

  return {
    healthOk: health.ok,
    readyOk,
    version,
    detail,
    healthBody: health.data,
    readyBody,
    summary,
    probeResponse,
  };
}

/** Fan-out health checks for all configured admin service targets. */
export async function fetchServiceHealth(): Promise<AdminServiceHealth[]> {
  const list = adminServiceTargets();
  const [httpServices, redis, supabase] = await Promise.all([
    Promise.all(
      list.map(async (target) => {
        const probe = await probeService(target);
        const configured = Boolean(target.baseUrl.trim());
        return {
          id: target.id,
          name: target.name,
          status: statusFromProbe(probe, configured),
          version: probe.version,
          detail: probe.summary ?? probe.detail,
          summary: probe.summary,
          probeResponse: probe.probeResponse,
        } satisfies AdminServiceHealth;
      }),
    ),
    probeRedisHealth(),
    probeSupabaseHealth(),
  ]);
  return [...httpServices, redis, supabase];
}
