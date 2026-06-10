/** Curated Argo CD deep links (UI only — no API token required). */

export const DEFAULT_ARGOCD_UI_URL = "https://argocd.taixingai.com";

export function argocdUiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_ARGOCD_UI_URL ?? "").trim();
  return (fromEnv || DEFAULT_ARGOCD_UI_URL).replace(/\/$/, "");
}

export function argocdApplicationUrl(appName: string): string {
  return `${argocdUiBase()}/applications/argocd/${encodeURIComponent(appName)}`;
}

export const ARGOCD_DEV_APPS: Array<{ name: string; label: string }> = [
  { name: "web-dev", label: "Web" },
  { name: "orchestrator-dev", label: "Orchestrator" },
  { name: "rag-query-dev", label: "RAG Query" },
  { name: "gateway-api-dev", label: "Gateway API" },
  { name: "gateway-inference-dev", label: "Inference GW" },
  { name: "gateway-embedding-dev", label: "Embed GW" },
  { name: "gateway-reranker-dev", label: "Reranker GW" },
  { name: "mcp-github-dev", label: "MCP GitHub" },
  { name: "qdrant-dev", label: "Qdrant" },
  { name: "observability", label: "Observability" },
  { name: "vllm-inference", label: "vLLM Inference" },
];
