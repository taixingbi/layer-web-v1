/**
 * Grafana Cloud Loki query_range client for admin logs page.
 */

import { adminConfig } from "@/lib/admin/config";
import type { AdminLogEntry, AdminLogsPayload } from "@/lib/admin/types";
import { adminLogServices, resolveLogService } from "@/lib/admin/log-services";

export type LokiQueryParams = {
  namespace: string;
  app: string;
  pod?: string;
  level?: string;
  search?: string;
  sinceMs: number;
  limit?: number;
};

type LokiStreamValue = [string, string];

type LokiQueryRangeResponse = {
  status: string;
  data?: {
    result?: Array<{
      stream?: Record<string, string>;
      values?: LokiStreamValue[];
    }>;
  };
};

function lokiQueryBase(): string | null {
  const raw = adminConfig.lokiQueryUrl.replace(/\/$/, "");
  if (!raw) return null;
  if (raw.includes("/loki/api/v1")) return raw.replace(/\/query_range\/?$/, "");
  return `${raw}/loki/api/v1`;
}

/** Build LogQL selector + pipeline for HuntAI JSON logs. */
export function buildLogql(params: LokiQueryParams): string {
  const cluster = adminConfig.lokiCluster;
  let selector = `{cluster="${cluster}",namespace="${params.namespace}",app="${params.app}"}`;
  if (params.pod?.trim()) {
    selector = `{cluster="${cluster}",namespace="${params.namespace}",app="${params.app}",pod=~"${escapeRegex(params.pod.trim())}.*"}`;
  }
  let pipeline = `${selector} | json`;
  const level = (params.level ?? "").trim().toLowerCase();
  if (level && level !== "all") {
    const upper = level.toUpperCase();
    pipeline += ` | level=~"${upper}|${level}"`;
  }
  const search = params.search?.trim();
  if (search) {
    pipeline += ` |= ${JSON.stringify(search)}`;
  }
  return pipeline;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseLogLine(raw: string): Partial<AdminLogEntry> {
  const trimmed = raw.trim();
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    return {
      level: pickString(obj, ["level", "Level"]) ?? undefined,
      message: pickString(obj, ["message", "event", "msg"]) ?? trimmed,
      requestId: pickString(obj, ["request_id", "requestId"]) ?? undefined,
      sessionId: pickString(obj, ["session_id", "sessionId"]) ?? undefined,
      userId: pickString(obj, ["user_id", "userId"]) ?? undefined,
      traceId: pickString(obj, ["trace_id", "traceId"]) ?? undefined,
      route: pickString(obj, ["route", "path"]) ?? undefined,
      latencyMs: pickNumber(obj, ["duration_ms", "latency_ms", "latencyMs"]),
      raw: trimmed,
    };
  } catch {
    return { message: trimmed, raw: trimmed };
  }
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function formatTs(ns: string): string {
  const ms = Math.floor(Number(ns) / 1_000_000);
  if (!Number.isFinite(ms)) return ns;
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}

function inferLevel(message: string, parsedLevel?: string): string {
  if (parsedLevel) return parsedLevel.toUpperCase();
  if (/\bERROR\b/i.test(message)) return "ERROR";
  if (/\bWARN(ING)?\b/i.test(message)) return "WARN";
  if (/\bINFO\b/i.test(message)) return "INFO";
  return "INFO";
}

export async function fetchAdminLogs(params: {
  serviceId: string;
  namespace?: string;
  pod?: string;
  level?: string;
  search?: string;
  sinceMs?: number;
  limit?: number;
}): Promise<AdminLogsPayload> {
  const svc = resolveLogService(params.serviceId);
  const services = adminLogServices();
  const sinceMs = params.sinceMs ?? 15 * 60 * 1000;
  const limit = Math.min(params.limit ?? 200, 1000);

  if (!adminConfig.lokiConfigured) {
    return {
      fetchedAt: new Date().toISOString(),
      source: "unconfigured",
      query: "",
      service: svc,
      services,
      entries: [],
      detail: "Set LOKI_QUERY_URL, LOKI_USERNAME, and LOKI_READ_TOKEN",
    };
  }

  if (!svc) {
    return {
      fetchedAt: new Date().toISOString(),
      source: "error",
      query: "",
      service: null,
      services,
      entries: [],
      detail: `Unknown service: ${params.serviceId}`,
    };
  }

  const namespace = params.namespace?.trim() || svc.namespace;
  const queryParams: LokiQueryParams = {
    namespace,
    app: svc.app,
    pod: params.pod,
    level: params.level,
    search: params.search,
    sinceMs,
    limit,
  };
  const query = buildLogql(queryParams);
  const endNs = `${Date.now()}000000`;
  const startNs = `${Date.now() - sinceMs}000000`;
  const base = lokiQueryBase();
  if (!base) {
    return {
      fetchedAt: new Date().toISOString(),
      source: "unconfigured",
      query,
      service: svc,
      services,
      entries: [],
      detail: "Invalid LOKI_QUERY_URL",
    };
  }

  const url = new URL(`${base}/query_range`);
  url.searchParams.set("query", query);
  url.searchParams.set("start", startNs);
  url.searchParams.set("end", endNs);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("direction", "backward");

  const auth = Buffer.from(
    `${adminConfig.lokiUsername}:${adminConfig.lokiReadToken}`,
  ).toString("base64");

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(adminConfig.lokiTimeoutMs),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        fetchedAt: new Date().toISOString(),
        source: "error",
        query,
        service: svc,
        services,
        entries: [],
        detail: `Loki HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const body = (await res.json()) as LokiQueryRangeResponse;
    const entries: AdminLogEntry[] = [];
    for (const stream of body.data?.result ?? []) {
      const app = stream.stream?.app ?? svc.app;
      const pod = stream.stream?.pod;
      for (const [ts, line] of stream.values ?? []) {
        const parsed = parseLogLine(line);
        const message = parsed.message ?? line;
        entries.push({
          ts: formatTs(ts),
          tsNs: ts,
          level: inferLevel(message, parsed.level),
          app,
          pod,
          message,
          requestId: parsed.requestId,
          sessionId: parsed.sessionId,
          userId: parsed.userId,
          traceId: parsed.traceId,
          route: parsed.route,
          latencyMs: parsed.latencyMs,
          raw: parsed.raw ?? line,
        });
      }
    }
    entries.sort((a, b) => Number(b.tsNs) - Number(a.tsNs));
    return {
      fetchedAt: new Date().toISOString(),
      source: "loki",
      query,
      service: svc,
      services,
      entries: entries.slice(0, limit),
    };
  } catch (err) {
    return {
      fetchedAt: new Date().toISOString(),
      source: "error",
      query,
      service: svc,
      services,
      entries: [],
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Cross-service trace: same search string across all HuntAI apps in namespace. */
export async function fetchTraceLogs(params: {
  search: string;
  namespace?: string;
  sinceMs?: number;
  limit?: number;
}): Promise<AdminLogEntry[]> {
  const search = params.search.trim();
  if (!search) return [];
  const results = await Promise.all(
    adminLogServices().map((svc) =>
      fetchAdminLogs({
        serviceId: svc.id,
        namespace: params.namespace,
        search,
        sinceMs: params.sinceMs ?? 60 * 60 * 1000,
        limit: Math.min(params.limit ?? 50, 100),
      }),
    ),
  );
  const merged = results.flatMap((r) => r.entries);
  merged.sort((a, b) => Number(b.tsNs) - Number(a.tsNs));
  return merged.slice(0, params.limit ?? 200);
}
