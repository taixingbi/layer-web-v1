/**
 * Prometheus instant-query helpers for admin KPI cards.
 */

import { adminConfig } from "@/lib/admin/config";
import {
  canonicalGpuKey,
  collectGpuKeys,
  dcgmMibToGb,
  dcgmRawToMib,
  dcgmTotalMib,
  gpuDisplayName,
  indexPromSamples,
  lookupPromSample,
  type PromSample,
} from "@/lib/admin/gpu-metrics";
import type {
  AdminGpuDevice,
  AdminInferenceSection,
  AdminInferenceWorkload,
  AdminOverviewKpis,
  AdminRagMetrics,
  AdminRouterSection,
} from "@/lib/admin/types";
import { versionPayload } from "@/lib/build-info";

type PromVector = PromSample;

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
  const workload = "inference";
  const [
    chatReplicas,
    embedReplicas,
    rerankReplicas,
    chatTokens,
    embedTokens,
    rerankReqRate,
    chatLatency,
    embedLatency,
    rerankLatency,
  ] = await Promise.all([
    promInstant(`count(up{workload="${workload}"} == 1)`),
    promInstant('count(up{workload="embedding"} == 1)'),
    promInstant('count(up{workload="reranker"} == 1)'),
    promInstant(`sum(rate(vllm:generation_tokens_total{workload="${workload}"}[1m]))`),
    promInstant('sum(rate(vllm:prompt_tokens_total{workload="embedding"}[1m]))'),
    promInstant('sum(rate(vllm:request_success_total{workload="reranker"}[1m]))'),
    promInstant(histogramQuantileMs("vllm:e2e_request_latency_seconds", `workload="${workload}"`)),
    promInstant(histogramQuantileMs("vllm:e2e_request_latency_seconds", 'workload="embedding"')),
    promInstant(histogramQuantileMs("vllm:e2e_request_latency_seconds", 'workload="reranker"')),
  ]);

  const workloads: AdminInferenceWorkload[] = [
    {
      id: "chat",
      label: "Chat",
      model: adminConfig.chatModel,
      replicas: parsePromScalar(chatReplicas) != null ? Math.round(parsePromScalar(chatReplicas)!) : null,
      tokensPerSecond: parsePromScalar(chatTokens) != null ? Math.round(parsePromScalar(chatTokens)!) : null,
      latencyP50Ms: parsePromScalar(chatLatency) != null ? Math.round(parsePromScalar(chatLatency)!) : null,
    },
    {
      id: "embedding",
      label: "Embedding",
      model: adminConfig.embeddingModel,
      replicas: parsePromScalar(embedReplicas) != null ? Math.round(parsePromScalar(embedReplicas)!) : null,
      tokensPerSecond: parsePromScalar(embedTokens) != null ? Math.round(parsePromScalar(embedTokens)!) : null,
      latencyP50Ms: parsePromScalar(embedLatency) != null ? Math.round(parsePromScalar(embedLatency)!) : null,
    },
    {
      id: "reranker",
      label: "Reranker",
      model: adminConfig.rerankerModel,
      replicas: parsePromScalar(rerankReplicas) != null ? Math.round(parsePromScalar(rerankReplicas)!) : null,
      tokensPerSecond: parsePromScalar(rerankReqRate) != null ? Math.round(parsePromScalar(rerankReqRate)!) : null,
      latencyP50Ms: parsePromScalar(rerankLatency) != null ? Math.round(parsePromScalar(rerankLatency)!) : null,
    },
  ];

  return {
    runtime: adminConfig.inferenceRuntime,
    workloads,
  };
}

async function queryGpuDevices(): Promise<AdminGpuDevice[]> {
  const [utilRes, usedRes, freeRes, totalRes, tempRes, powerRes] = await Promise.all([
    promInstant('DCGM_FI_DEV_GPU_UTIL{workload="gpu-telemetry"}'),
    promInstant('DCGM_FI_DEV_FB_USED{workload="gpu-telemetry"}'),
    promInstant('DCGM_FI_DEV_FB_FREE{workload="gpu-telemetry"}'),
    promInstant('DCGM_FI_DEV_FB_TOTAL{workload="gpu-telemetry"}'),
    promInstant('DCGM_FI_DEV_GPU_TEMP{workload="gpu-telemetry"}'),
    promInstant('DCGM_FI_DEV_POWER_USAGE{workload="gpu-telemetry"}'),
  ]);

  const utilRows = parsePromVector(utilRes);
  const usedByKey = indexPromSamples(parsePromVector(usedRes));
  const freeByKey = indexPromSamples(parsePromVector(freeRes));
  const totalByKey = indexPromSamples(parsePromVector(totalRes));
  const tempByKey = indexPromSamples(parsePromVector(tempRes));
  const powerByKey = indexPromSamples(parsePromVector(powerRes));
  const utilByKey = indexPromSamples(utilRows);

  const keys = collectGpuKeys(
    utilRows,
    parsePromVector(usedRes),
    parsePromVector(freeRes),
    parsePromVector(totalRes),
    parsePromVector(tempRes),
    parsePromVector(powerRes),
  );

  return keys.map((key) => {
    const utilRow = utilByKey.get(key) ?? [...utilByKey.values()].find((r) => canonicalGpuKey(r.metric) === key);
    const reference = utilRow?.metric ?? { gpu: "0" };
    const used = lookupPromSample(usedByKey, reference);
    const free = lookupPromSample(freeByKey, reference);
    const total = lookupPromSample(totalByKey, reference);
    const temp = lookupPromSample(tempByKey, reference);
    const power = lookupPromSample(powerByKey, reference);
    const sampleMetric = utilRow?.metric ?? used?.metric ?? free?.metric ?? total?.metric ?? reference;
    const usedMib = used ? dcgmRawToMib(Number(used.value[1])) : null;
    const freeMib = free ? dcgmRawToMib(Number(free.value[1])) : null;
    const totalMibRaw = total ? dcgmRawToMib(Number(total.value[1])) : null;
    const totalMib = dcgmTotalMib(usedMib ?? NaN, freeMib ?? NaN, totalMibRaw ?? NaN);
    const utilValue = utilRow ? Number(utilRow.value[1]) : NaN;

    return {
      name: gpuDisplayName(sampleMetric),
      util: Number.isFinite(utilValue) ? round1(utilValue) : null,
      memoryUsedGb: usedMib != null ? dcgmMibToGb(usedMib) : null,
      memoryTotalGb: totalMib != null ? dcgmMibToGb(totalMib) : null,
      tempC: temp ? round1(Number(temp.value[1])) : null,
      powerW: power ? round1(Number(power.value[1])) : null,
    };
  });
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
      inference: {
        runtime: adminConfig.inferenceRuntime,
        workloads: [
          { id: "chat", label: "Chat", model: adminConfig.chatModel, replicas: null, tokensPerSecond: null, latencyP50Ms: null },
          { id: "embedding", label: "Embedding", model: adminConfig.embeddingModel, replicas: null, tokensPerSecond: null, latencyP50Ms: null },
          { id: "reranker", label: "Reranker", model: adminConfig.rerankerModel, replicas: null, tokensPerSecond: null, latencyP50Ms: null },
        ],
      },
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
      inference: {
        runtime: adminConfig.inferenceRuntime,
        workloads: [
          { id: "chat", label: "Chat", model: adminConfig.chatModel, replicas: null, tokensPerSecond: null, latencyP50Ms: null },
          { id: "embedding", label: "Embedding", model: adminConfig.embeddingModel, replicas: null, tokensPerSecond: null, latencyP50Ms: null },
          { id: "reranker", label: "Reranker", model: adminConfig.rerankerModel, replicas: null, tokensPerSecond: null, latencyP50Ms: null },
        ],
      },
      gpu: [],
    };
  }
}
