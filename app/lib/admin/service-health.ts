/**
 * Parallel /health (+ optional /ready) probes for admin service health cards.
 */

import { adminConfig, adminServiceTargets, type AdminServiceTarget } from "@/lib/admin/config";
import type { AdminServiceHealth, ServiceStatus } from "@/lib/admin/types";

type ProbeResult = {
  healthOk: boolean;
  readyOk: boolean | null;
  version: string | null;
  detail: string | null;
};

async function fetchJson(url: string, timeoutMs: number): Promise<{ ok: boolean; data: Record<string, unknown> }> {
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
        data = { raw: text.slice(0, 120) };
      }
    }
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, data: { error: err instanceof Error ? err.message : String(err) } };
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

async function probeService(target: AdminServiceTarget): Promise<ProbeResult> {
  const base = target.baseUrl.replace(/\/$/, "");
  if (!base) {
    return { healthOk: false, readyOk: null, version: null, detail: "URL not configured" };
  }

  const healthPath = target.healthPath ?? "/health";
  const health = await fetchJson(`${base}${healthPath}`, adminConfig.healthTimeoutMs);
  let readyOk: boolean | null = null;
  if (target.readyPath) {
    const ready = await fetchJson(`${base}${target.readyPath}`, adminConfig.healthTimeoutMs);
    readyOk = ready.ok;
  }

  let version = versionFromPayload(health.data);
  if (!version) {
    const versionRes = await fetchJson(`${base}/version`, adminConfig.healthTimeoutMs);
    if (versionRes.ok) {
      version = versionFromPayload(versionRes.data);
    }
  }

  const detail =
    typeof health.data.error === "string"
      ? health.data.error
      : typeof health.data.detail === "string"
        ? health.data.detail
        : null;

  return {
    healthOk: health.ok,
    readyOk,
    version,
    detail,
  };
}

/** Fan-out health checks for all configured admin service targets. */
export async function fetchServiceHealth(): Promise<AdminServiceHealth[]> {
  const list = adminServiceTargets();
  return Promise.all(
    list.map(async (target) => {
      const probe = await probeService(target);
      const configured = Boolean(target.baseUrl.trim());
      return {
        id: target.id,
        name: target.name,
        status: statusFromProbe(probe, configured),
        version: probe.version,
        detail: probe.detail,
      } satisfies AdminServiceHealth;
    }),
  );
}
