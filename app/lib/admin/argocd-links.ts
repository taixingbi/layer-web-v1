/** Curated Argo CD deep links (UI only — no API token required). */

export const DEFAULT_ARGOCD_UI_URL = "https://argocd.taixingai.com";

export type ArgoCdAppLink = { name: string; label: string };

export type ArgoCdStackWorkflow = {
  /** Request path: Web → Gateway API → Orchestrator */
  linear: ArgoCdAppLink[];
  /** Parallel routes from orchestrator */
  branch: ArgoCdAppLink[];
};

export function argocdUiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_ARGOCD_UI_URL ?? "").trim();
  return (fromEnv || DEFAULT_ARGOCD_UI_URL).replace(/\/$/, "");
}

export function argocdApplicationUrl(appName: string): string {
  return `${argocdUiBase()}/applications/argocd/${encodeURIComponent(appName)}`;
}

/** User stack in ai-dev — request order for workflow arrows. */
export const ARGOCD_DEV_WORKFLOW: ArgoCdStackWorkflow = {
  linear: [
    { name: "web-dev", label: "Web" },
    { name: "gateway-api-dev", label: "Gateway API" },
    { name: "orchestrator-dev", label: "Orchestrator" },
  ],
  branch: [
    { name: "rag-query-dev", label: "RAG Query" },
    { name: "mcp-github-dev", label: "MCP GitHub" },
  ],
};

/** User stack in ai-prod — same shape as dev for side-by-side compare. */
export const ARGOCD_PROD_WORKFLOW: ArgoCdStackWorkflow = {
  linear: [
    { name: "web-prod", label: "Web" },
    { name: "gateway-api-prod", label: "Gateway API" },
    { name: "orchestrator-prod", label: "Orchestrator" },
  ],
  branch: [
    { name: "rag-query-prod", label: "RAG Query" },
    { name: "mcp-github-prod", label: "MCP GitHub" },
  ],
};

/** Platform backends — stack depends on these (no prod Argo CD Application). */
export const ARGOCD_SHARED_PLATFORM_APPS: ArgoCdAppLink[] = [
  { name: "gateway-inference-dev", label: "Inference GW" },
  { name: "gateway-embedding-dev", label: "Embed GW" },
  { name: "gateway-reranker-dev", label: "Reranker GW" },
  { name: "qdrant-dev", label: "Qdrant" },
  { name: "vllm-inference", label: "vLLM Inference" },
];

/** Cross-cutting monitoring — not on the request path. */
export const ARGOCD_SHARED_MONITOR_APPS: ArgoCdAppLink[] = [
  { name: "observability", label: "Observability" },
];
