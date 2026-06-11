/** Curated CI/CD deep links — GitHub Actions + Argo CD UI (no in-cluster API). */

export const DEFAULT_ARGOCD_UI_URL = "https://argocd.taixingai.com";

const WORKFLOW_DOCKER_PUSH = "docker-push.yml";
const WORKFLOW_K3S_CI = "ci.yaml";

export type ArgoCdAppLink = {
  name: string;
  label: string;
  githubRepo: string;
  workflow?: string;
};

export type ArgoCdStackWorkflow = {
  /** Request path: Web → Gateway API → Orchestrator */
  linear: ArgoCdAppLink[];
  /** Parallel routes from orchestrator */
  branch: ArgoCdAppLink[];
};

function app(
  name: string,
  label: string,
  githubRepo: string,
  workflow = WORKFLOW_DOCKER_PUSH,
): ArgoCdAppLink {
  return { name, label, githubRepo, workflow };
}

function k3sApp(name: string, label: string): ArgoCdAppLink {
  return app(name, label, "huntai-k3s", WORKFLOW_K3S_CI);
}

export function argocdUiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_ARGOCD_UI_URL ?? "").trim();
  return (fromEnv || DEFAULT_ARGOCD_UI_URL).replace(/\/$/, "");
}

export function argocdApplicationUrl(appName: string): string {
  return `${argocdUiBase()}/applications/argocd/${encodeURIComponent(appName)}`;
}

export function githubActionsUrl(repo: string, workflow = WORKFLOW_DOCKER_PUSH): string {
  return `https://github.com/taixingbi/${repo}/actions/workflows/${encodeURIComponent(workflow)}`;
}

/** User stack in ai-dev — request order for workflow arrows. */
export const ARGOCD_DEV_WORKFLOW: ArgoCdStackWorkflow = {
  linear: [
    app("web-dev", "Web", "layer-web-v1"),
    app("gateway-api-dev", "Gateway API", "layer-gateway-api-v1"),
    app("orchestrator-dev", "Orchestrator", "layer-orchestrator-v1"),
  ],
  branch: [
    app("rag-query-dev", "RAG Query", "layer-rag-query-v1"),
    app("mcp-github-dev", "MCP GitHub", "layer-mcp-github-v1"),
  ],
};

/** User stack in ai-prod — same shape as dev for side-by-side compare. */
export const ARGOCD_PROD_WORKFLOW: ArgoCdStackWorkflow = {
  linear: [
    app("web-prod", "Web", "layer-web-v1"),
    app("gateway-api-prod", "Gateway API", "layer-gateway-api-v1"),
    app("orchestrator-prod", "Orchestrator", "layer-orchestrator-v1"),
  ],
  branch: [
    app("rag-query-prod", "RAG Query", "layer-rag-query-v1"),
    app("mcp-github-prod", "MCP GitHub", "layer-mcp-github-v1"),
  ],
};

/** Platform backends — stack depends on these (no prod Argo CD Application). */
export const ARGOCD_SHARED_PLATFORM_APPS: ArgoCdAppLink[] = [
  app("gateway-inference-dev", "Inference GW", "layer-gateway-inference-v1"),
  app("gateway-embedding-dev", "Embed GW", "layer-gateway-embed-v1"),
  app("gateway-reranker-dev", "Reranker GW", "layer-gateway-reranker-v1"),
  k3sApp("qdrant-dev", "Qdrant"),
  k3sApp("vllm-inference", "vLLM Inference"),
];

/** Cross-cutting monitoring — not on the request path. */
export const ARGOCD_SHARED_MONITOR_APPS: ArgoCdAppLink[] = [
  k3sApp("observability", "Observability"),
];
