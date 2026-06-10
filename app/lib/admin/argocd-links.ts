/** Curated Argo CD deep links (UI only — no API token required). */

export const DEFAULT_ARGOCD_UI_URL = "https://argocd.taixingai.com";

export type ArgoCdAppLink = { name: string; label: string };

export function argocdUiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_ARGOCD_UI_URL ?? "").trim();
  return (fromEnv || DEFAULT_ARGOCD_UI_URL).replace(/\/$/, "");
}

export function argocdApplicationUrl(appName: string): string {
  return `${argocdUiBase()}/applications/argocd/${encodeURIComponent(appName)}`;
}

/** User stack in ai-dev — paired with prod below. */
export const ARGOCD_DEV_STACK_APPS: ArgoCdAppLink[] = [
  { name: "web-dev", label: "Web" },
  { name: "orchestrator-dev", label: "Orchestrator" },
  { name: "rag-query-dev", label: "RAG Query" },
  { name: "gateway-api-dev", label: "Gateway API" },
  { name: "mcp-github-dev", label: "MCP GitHub" },
];

/** User stack in ai-prod — same order as dev for side-by-side compare. */
export const ARGOCD_PROD_STACK_APPS: ArgoCdAppLink[] = [
  { name: "web-prod", label: "Web" },
  { name: "orchestrator-prod", label: "Orchestrator" },
  { name: "rag-query-prod", label: "RAG Query" },
  { name: "gateway-api-prod", label: "Gateway API" },
  { name: "mcp-github-prod", label: "MCP GitHub" },
];

/** Dev / platform — no separate prod Argo CD Application. */
export const ARGOCD_SHARED_APPS: ArgoCdAppLink[] = [
  { name: "gateway-inference-dev", label: "Inference GW" },
  { name: "gateway-embedding-dev", label: "Embed GW" },
  { name: "gateway-reranker-dev", label: "Reranker GW" },
  { name: "qdrant-dev", label: "Qdrant" },
  { name: "observability", label: "Observability" },
  { name: "vllm-inference", label: "vLLM Inference" },
];
