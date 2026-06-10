/** HuntAI workloads as they appear in Loki (Alloy `app` label). */

export type AdminLogService = {
  id: string;
  name: string;
  app: string;
  namespace: string;
};

export function adminLogServices(): AdminLogService[] {
  const ns = (process.env.ADMIN_DEFAULT_NAMESPACE ?? "ai-dev").trim() || "ai-dev";
  return [
    { id: "gateway-api", name: "Gateway API", app: "layer-gateway-api", namespace: ns },
    { id: "orchestrator", name: "Orchestrator", app: "layer-orchestrator", namespace: ns },
    { id: "rag-query", name: "RAG Query", app: "layer-rag-query", namespace: ns },
    { id: "gateway-inference", name: "Inference GW", app: "layer-gateway-inference", namespace: ns },
    { id: "gateway-embedding", name: "Embed GW", app: "layer-gateway-embedding", namespace: ns },
    { id: "gateway-reranker", name: "Reranker GW", app: "layer-gateway-reranker", namespace: ns },
    { id: "web", name: "Web", app: "layer-web", namespace: ns },
    { id: "mcp-github", name: "MCP GitHub", app: "layer-mcp-github", namespace: ns },
  ];
}

export function resolveLogService(serviceId: string): AdminLogService | null {
  const id = serviceId.trim();
  return adminLogServices().find((s) => s.id === id) ?? null;
}
