/** Vendored Grafana Cloud deep links for admin observability page (UI only). */

export const DEFAULT_GRAFANA_BASE_URL = "https://taixingbi.grafana.net";

export type GrafanaObservabilityLink = {
  label: string;
  /** Path + query on the Grafana stack (or full https URL). */
  path: string;
  hint?: string;
};

export function grafanaUiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_GRAFANA_BASE_URL ?? "").trim();
  return (fromEnv || DEFAULT_GRAFANA_BASE_URL).replace(/\/$/, "");
}

export function grafanaObservabilityUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${grafanaUiBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Curated dashboards — paths copied from taixingbi.grafana.net. */
export const GRAFANA_OBSERVABILITY_LINKS: GrafanaObservabilityLink[] = [
  {
    label: "Loki logs",
    hint: "last 1h",
    path: "/d/ta5v5f8/loki-logs?orgId=1&from=now-1h&to=now&timezone=browser",
  },
  {
    label: "vLLM Inference",
    hint: "Qwen · 6h",
    path: "/d/layer-vllm-inference/vllm-inference-qwen?orgId=1&from=now-6h&to=now&timezone=browser&refresh=30s",
  },
  {
    label: "vLLM Embedding",
    hint: "BGE-M3 · 6h",
    path: "/d/layer-vllm-embedding/vllm-embedding-bge-m3?orgId=1&from=now-6h&to=now&timezone=browser&refresh=30s",
  },
  {
    label: "vLLM Reranker",
    hint: "6h",
    path: "/d/layer-vllm-reranker/vllm-reranker?orgId=1&from=now-6h&to=now&timezone=browser&refresh=30s",
  },
  {
    label: "GPU (DCGM)",
    hint: "6h",
    path: "/d/layer-gpu-dcgm/gpu-dcgm?orgId=1&from=now-6h&to=now&timezone=browser&refresh=30s",
  },
];
