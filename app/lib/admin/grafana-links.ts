/** Grafana Cloud deep links for admin logs page (UI only — no Loki API from HuntAI). */

export const DEFAULT_GRAFANA_BASE_URL = "https://taixingbi.grafana.net";
export const DEFAULT_LOKI_DATASOURCE = "grafanacloud-logs";

export function grafanaUiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_GRAFANA_BASE_URL ?? "").trim();
  return (fromEnv || DEFAULT_GRAFANA_BASE_URL).replace(/\/$/, "");
}

function lokiDatasource(): string {
  return (process.env.NEXT_PUBLIC_GRAFANA_LOKI_DATASOURCE ?? "").trim() || DEFAULT_LOKI_DATASOURCE;
}

function logNamespace(): string {
  return (process.env.NEXT_PUBLIC_ADMIN_LOG_NAMESPACE ?? "ai-dev").trim() || "ai-dev";
}

function logCluster(): string {
  return (process.env.NEXT_PUBLIC_LOKI_CLUSTER ?? "k3s").trim() || "k3s";
}

export function grafanaDashboardUrl(uid: string): string {
  return `${grafanaUiBase()}/d/${encodeURIComponent(uid)}`;
}

export function grafanaExploreLogqlUrl(expr: string, rangeFrom = "now-1h"): string {
  const panes = {
    huntai: {
      datasource: lokiDatasource(),
      queries: [{ refId: "A", expr, queryType: "range" }],
      range: { from: rangeFrom, to: "now" },
    },
  };
  const params = new URLSearchParams({
    schemaVersion: "1",
    panes: JSON.stringify(panes),
    orgId: "1",
  });
  return `${grafanaUiBase()}/explore?${params.toString()}`;
}

export function serviceLogExploreUrl(app: string): string {
  const cluster = logCluster();
  const ns = logNamespace();
  const expr = `{cluster="${cluster}",namespace="${ns}",app="${app}"} | json`;
  return grafanaExploreLogqlUrl(expr);
}

export const GRAFANA_LOG_SERVICES: Array<{ label: string; app: string }> = [
  { label: "Gateway API", app: "layer-gateway-api" },
  { label: "Orchestrator", app: "layer-orchestrator" },
  { label: "RAG Query", app: "layer-rag-query" },
  { label: "Inference GW", app: "layer-gateway-inference" },
  { label: "Embed GW", app: "layer-gateway-embedding" },
  { label: "Reranker GW", app: "layer-gateway-reranker" },
  { label: "Web", app: "layer-web" },
  { label: "MCP GitHub", app: "layer-mcp-github" },
];

export const GRAFANA_DASHBOARDS: Array<{ label: string; uid: string }> = [
  { label: "HTTP / gateway logs", uid: "layer-loki-http-logs" },
  { label: "Inference", uid: "layer-vllm-inference" },
  { label: "Embedding", uid: "layer-vllm-embedding" },
  { label: "Reranker", uid: "layer-vllm-reranker" },
  { label: "GPU (DCGM)", uid: "layer-gpu-dcgm" },
];
