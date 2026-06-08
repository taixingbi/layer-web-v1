/**
 * Server-side admin dashboard config (service URLs, Prometheus, Supabase).
 * Do not import from client components.
 */

import { config } from "@/lib/config";

function fromEnv(name: string, fallback = ""): string {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const trimmed = v.split("#")[0].trim().replace(/^["']|["']$/g, "").trim();
  return trimmed || fallback;
}

function floatEnv(name: string): number | null {
  const v = fromEnv(name);
  if (!v) return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export type AdminServiceTarget = {
  id: string;
  name: string;
  baseUrl: string;
  /** Liveness path (default `/health`). Qdrant uses `/healthz`. */
  healthPath?: string;
  readyPath?: string;
};

/** Optional upstream origins probed for service health (empty URL skips probe). */
export function adminServiceTargets(): AdminServiceTarget[] {
  return [
    { id: "gateway-api", name: "Gateway API", baseUrl: config.gatewayBaseUrl, readyPath: "/ready" },
    {
      id: "orchestrator",
      name: "Orchestrator",
      baseUrl: fromEnv("ORCHESTRATOR_BASE_URL"),
      readyPath: "/ready",
    },
    { id: "rag-query", name: "RAG Query", baseUrl: fromEnv("RAG_QUERY_BASE_URL"), readyPath: "/ready" },
    {
      id: "gateway-inference",
      name: "Inference GW",
      baseUrl: fromEnv("INFERENCE_GATEWAY_BASE_URL"),
      readyPath: "/ready",
    },
    {
      id: "gateway-embedding",
      name: "Embed GW",
      baseUrl: fromEnv("EMBED_GATEWAY_BASE_URL"),
      readyPath: "/ready",
    },
    {
      id: "gateway-reranker",
      name: "Reranker GW",
      baseUrl: fromEnv("RERANKER_GATEWAY_BASE_URL"),
      readyPath: "/ready",
    },
    { id: "qdrant", name: "Qdrant", baseUrl: fromEnv("QDRANT_BASE_URL"), healthPath: "/healthz" },
  ];
}

export const adminConfig = {
  get prometheusUrl(): string {
    return fromEnv("PROMETHEUS_URL").replace(/\/$/, "");
  },

  get supabaseUrl(): string {
    return fromEnv("SUPABASE_URL").replace(/\/$/, "");
  },

  get supabaseServiceKey(): string {
    return fromEnv("SUPABASE_SERVICE_KEY") || fromEnv("SUPABASE_SERVICE_ROLE_KEY");
  },

  /** Shared secret for non-interactive admin API access. */
  get adminApiKey(): string {
    return fromEnv("ADMIN_API_KEY");
  },

  get routerVersion(): string {
    return fromEnv("ADMIN_ROUTER_VERSION", "router-v2");
  },

  get routerAccuracy(): number | null {
    return floatEnv("ADMIN_ROUTER_ACCURACY");
  },

  get routerEvaluatedAt(): string | null {
    const v = fromEnv("ADMIN_ROUTER_EVALUATED_AT");
    return v || null;
  },

  get chatModel(): string | null {
    const v = fromEnv("ADMIN_INFERENCE_MODEL") || fromEnv("ADMIN_CHAT_MODEL");
    return v || null;
  },

  get embeddingModel(): string {
    return fromEnv("ADMIN_EMBEDDING_MODEL", "BAAI/bge-m3");
  },

  get rerankerModel(): string {
    return fromEnv("ADMIN_RERANKER_MODEL", "BAAI/bge-reranker-v2-m3");
  },

  get inferenceRuntime(): string {
    return fromEnv("ADMIN_INFERENCE_RUNTIME", "vLLM");
  },

  healthTimeoutMs: 3_000,
  prometheusTimeoutMs: 5_000,
  supabaseTimeoutMs: 5_000,
};
