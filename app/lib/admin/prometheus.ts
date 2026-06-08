/**
 * Prometheus instant-query helpers for admin KPI cards.
 */

import { adminConfig } from "@/lib/admin/config";
import type {
  AdminGpuDevice,
  AdminInferenceSection,
  AdminOverviewKpis,
  AdminRagMetrics,
  AdminRouterSection,
} from "@/lib/admin/types";
import { versionPayload } from "@/lib/build-info";

type PromVector = {
  metric: Record<string, string>;
  value: [number, string];
};

type PromQueryResponse = {
  status: "success" | "error";
  data?: {
    resultType?: string;
    result?: PromVector[];
  };
  error?: string;
};

export function parsePromScalar(body: PromQueryResponse | null): number | null {
  const raw = body?.data?.result?.[0]?.value?.[1];
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parsePromVector(body: PromQueryResponse | null): PromVector[] {
  return body?.data?.result ?? [];
}

async function promInstant(query: string): Promise<PromQueryResponse | null> {
  const base = adminConfig.prometheusUrl;
  if (!base) return null;
  const url = `${base}/api/v1/query?query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(adminConfig.prometheusTimeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as PromQueryResponse;
  } catch {
    return null;
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Convert route counter vector to percentage map (sums to ~100). */
export function routeDistributionFromVector(vectors: PromVector[]): Record<string, number> {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of vectors) {
    const route = (row.metric.route || row.metric.label || "unknown").trim() || "unknown";
    const n = Number(row.value[1]);
    if (!Number.isFinite(n) || n <= 0) continue;
    counts[route] = (counts[route] ?? 0) + n;
    total += n;
  }
  if (total <= 0) return {};
  const out: Record<string, number> = {};
  for (const [route, count] of Object.entries(counts)) {
    out[route] = round1((count / total) * 100);
  }
  return out;
}

function histogramQuantileMs(metricBase: string, labels = "", window = "5m"): string {
  const selector = labels ? `${metricBase}{${labels}}` : metricBase;
  return `histogram_quantile(0.5, sum by (le) (rate(${selector}_bucket[${window}]))) * 1000`;
}

async function queryOverviewKpis(): Promise<Partial<AdminOverviewKpis>> {
  const [
    usersOnline,
    rpm,
    successRate,
    avgLatencyMs,
    gpuUtil,
  ] = await Promise.all([
    promInstant("sum(gateway_chat_streams_inflight)"),
    promInstant('sum(rate(gateway_requests_total{path="/v1/chat"}[1m])) * 60'),
    promInstant(
      '100 * (1 - (sum(rate(gateway_requests_total{path="/v1/chat",status=~"5.."}[5m])) / sum(rate(gateway_requests_total{path="/v1/chat"}[5m]))))',
    ),
    promInstant(
      'sum(rate(gateway_request_latency_ms_sum{path="/v1/chat"}[5m])) / sum(rate(gateway_request_latency_ms_count{path="/v1/chat"}[5m]))',
    ),
    promInstant('avg(DCGM_FI_DEV_GPU_UTIL{workload="gpu-telemetry"})'),
  ]);

  const version = versionPayload().version;
  return {
    usersOnline: parsePromScalar(usersOnline),
    requestsPerMinute: parsePromScalar(rpm) != null ? Math.round(parsePromScalar(rpm)!) : null,
    successRate: parsePromScalar(successRate) != null ? round1(parsePromScalar(successRate)!) : null,
    avgLatencyMs: parsePromScalar(avgLatencyMs) != null ? Math.round(parsePromScalar(avgLatencyMs)!) : null,
    gpuUtil: parsePromScalar(gpuUtil) != null ? round1(parsePromScalar(gpuUtil)!) : null,
    version: version.startsWith("v") ? version : `v${version}`,
  };
}

async function queryRouterSection(): Promise<Partial<AdminRouterSection>> {
  const distributionRes = await promInstant("sum by (route) (orchestrator_route_decisions_total)");
  const distribution = routeDistributionFromVector(parsePromVector(distributionRes));
  return {
    version: adminConfig.routerVersion,
    accuracy: adminConfig.routerAccuracy,
    accuracySource: adminConfig.routerAccuracy != null ? "golden_eval" : "unavailable",
    evaluatedAt: adminConfig.routerEvaluatedAt,
    distribution,
    distributionSource: Object.keys(distribution).length ? "prometheus" : "unavailable",
  };
}

async function queryRagMetrics(): Promise<Partial<AdminRagMetrics>> {
  const [retrieval, embed, rerank] = await Promise.all([
    promInstant(histogramQuantileMs("orchestrator_rag_duration_seconds")),
    promInstant(histogramQuantileMs("rag_query_phase_duration_seconds", 'phase="embed"')),
    promInstant(histogramQuantileMs("rag_query_phase_duration_seconds", 'phase="rerank"')),
  ]);

  return {
    retrievalP50Ms: parsePromScalar(retrieval) != null ? Math.round(parsePromScalar(retrieval)!) : null,
    embedP50Ms: parsePromScalar(embed) != null ? Math.round(parsePromScalar(embed)!) : null,
    rerankP50Ms: parsePromScalar(rerank) != null ? Math.round(parsePromScalar(rerank)!) : null,
    contextSize: null,
    hitRate: null,
    source: parsePromScalar(retrieval) != null ? "prometheus" : "unavailable",
  };
}

async function queryInferenceSection(): Promise<Partial<AdminInferenceSection>> {
  const [ttft, full, tokensPerSecond, replicas] = await Promise.all([
    promInstant(histogramQuantileMs("gateway_ttfb_ms")),
    promInstant(histogramQuantileMs("gateway_request_latency_ms{path=\"/v1/chat/completions\"}")),
    promInstant("sum(rate(vllm:generation_tokens_total[1m]))"),
    promInstant('count(up{job=~"vllm-chat.*"} == 1)'),
  ]);

  return {
    model: adminConfig.inferenceModel,
    runtime: adminConfig.inferenceRuntime,
    replicas: parsePromScalar(replicas) != null ? Math.round(parsePromScalar(replicas)!) : null,
    ttftP50Ms: parsePromScalar(ttft) != null ? Math.round(parsePromScalar(ttft)!) : null,
    fullP50Ms: parsePromScalar(full) != null ? Math.round(parsePromScalar(full)!) : null,
    tokensPerSecond: parsePromScalar(tokensPerSecond) != null ? Math.round(parsePromScalar(tokensPerSecond)!) : null,
  };
}

async function queryGpuDevices(): Promise<AdminGpuDevice[]> {
  const [utilRes, usedRes, totalRes, tempRes, powerRes] = await Promise.all([
    promInstant('DCGM_FI_DEV_GPU_UTIL{workload="gpu-telemetry"}'),
    promInstant('DCGM_FI_DEV_FB_USED{workload="gpu-telemetry"}'),
    promInstant('DCGM_FI_DEV_FB_TOTAL{workload="gpu-telemetry"}'),
    promInstant('DCGM_FI_DEV_GPU_TEMP{workload="gpu-telemetry"}'),
    promInstant('DCGM_FI_DEV_POWER_USAGE{workload="gpu-telemetry"}'),
  ]);

  const utilByGpu = new Map<string, PromVector>();
  for (const row of parsePromVector(utilRes)) {
    const key = row.metric.gpu ?? row.metric.GPU ?? row.metric.device ?? "0";
    utilByGpu.set(key, row);
  }

  const devices: AdminGpuDevice[] = [];
  for (const [gpuKey, utilRow] of utilByGpu.entries()) {
    const match = (rows: PromVector[]) =>
      rows.find((r) => (r.metric.gpu ?? r.metric.GPU ?? r.metric.device) === gpuKey);
    const used = match(parsePromVector(usedRes));
    const total = match(parsePromVector(totalRes));
    const temp = match(parsePromVector(tempRes));
    const power = match(parsePromVector(powerRes));
    const modelName = utilRow.metric.modelName ?? utilRow.metric.model ?? "GPU";
    const usedBytes = used ? Number(used.value[1]) : NaN;
    const totalBytes = total ? Number(total.value[1]) : NaN;
    devices.push({
      name: `GPU${gpuKey} ${modelName}`.trim(),
      util: round1(Number(utilRow.value[1])),
      memoryUsedGb: Number.isFinite(usedBytes) ? round1(usedBytes / 1024 ** 3) : null,
      memoryTotalGb: Number.isFinite(totalBytes) ? round1(totalBytes / 1024 ** 3) : null,
      tempC: temp ? round1(Number(temp.value[1])) : null,
      powerW: power ? round1(Number(power.value[1])) : null,
    });
  }

  return devices.sort((a, b) => a.name.localeCompare(b.name));
}

export type PrometheusBundle = {
  source: "ok" | "unconfigured" | "error";
  overview: Partial<AdminOverviewKpis>;
  router: Partial<AdminRouterSection>;
  rag: Partial<AdminRagMetrics>;
  inference: Partial<AdminInferenceSection>;
  gpu: AdminGpuDevice[];
};

/** Query Prometheus for KPI, router, RAG, inference, and GPU sections. */
export async function fetchPrometheusBundle(): Promise<PrometheusBundle> {
  if (!adminConfig.prometheusUrl) {
    return {
      source: "unconfigured",
      overview: { version: versionPayload().version.startsWith("v") ? versionPayload().version : `v${versionPayload().version}` },
      router: {
        version: adminConfig.routerVersion,
        accuracy: adminConfig.routerAccuracy,
        accuracySource: adminConfig.routerAccuracy != null ? "golden_eval" : "unavailable",
        evaluatedAt: adminConfig.routerEvaluatedAt,
        distribution: {},
        distributionSource: "unavailable",
      },
      rag: { source: "unavailable" },
      inference: { runtime: adminConfig.inferenceRuntime, model: adminConfig.inferenceModel },
      gpu: [],
    };
  }

  try {
    const [overview, router, rag, inference, gpu] = await Promise.all([
      queryOverviewKpis(),
      queryRouterSection(),
      queryRagMetrics(),
      queryInferenceSection(),
      queryGpuDevices(),
    ]);
    return { source: "ok", overview, router, rag, inference, gpu };
  } catch {
    return {
      source: "error",
      overview: { version: versionPayload().version },
      router: { version: adminConfig.routerVersion, distribution: {}, distributionSource: "unavailable", accuracySource: "unavailable" },
      rag: { source: "unavailable" },
      inference: { runtime: adminConfig.inferenceRuntime },
      gpu: [],
    };
  }
}
