/** Normalized admin dashboard payload returned by GET /api/admin/overview. */

export type ServiceStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

/** Health/readiness probe bodies returned to the admin UI inspect panel. */
export type AdminServiceProbeResponse = {
  health?: Record<string, unknown>;
  ready?: Record<string, unknown>;
  meta?: {
    healthOk?: boolean;
    readyOk?: boolean | null;
  };
};

export type AdminServiceHealth = {
  id: string;
  name: string;
  status: ServiceStatus;
  version?: string | null;
  p50Ms?: number | null;
  /** @deprecated prefer summary — kept for backwards compatibility */
  detail?: string | null;
  /** One-line hover hint (failures or dependency summary). */
  summary?: string | null;
  /** Full probe JSON for click-to-inspect. */
  probeResponse?: AdminServiceProbeResponse | null;
};

export type AdminOverviewKpis = {
  usersOnline: number | null;
  requestsPerMinute: number | null;
  successRate: number | null;
  avgLatencyMs: number | null;
  gpuUtil: number | null;
  version: string;
};

export type AdminRouterSection = {
  version: string;
  accuracy: number | null;
  accuracySource: "golden_eval" | "unavailable";
  evaluatedAt: string | null;
  distribution: Record<string, number>;
  distributionSource: "prometheus" | "supabase" | "unavailable";
};

export type AdminRagMetrics = {
  retrievalP50Ms: number | null;
  embedP50Ms: number | null;
  rerankP50Ms: number | null;
  contextSize: number | null;
  hitRate: number | null;
  source: "prometheus" | "supabase" | "unavailable";
};

export type AdminInferenceWorkload = {
  id: "chat" | "embedding" | "reranker";
  label: string;
  model: string | null;
  replicas: number | null;
  tokensPerSecond: number | null;
  latencyP50Ms: number | null;
};

export type AdminInferenceSection = {
  runtime: string;
  workloads: AdminInferenceWorkload[];
};

export type AdminGpuDevice = {
  name: string;
  util: number | null;
  memoryUsedGb: number | null;
  memoryTotalGb: number | null;
  tempC: number | null;
  powerW: number | null;
};

export type AdminRecentRequest = {
  at: string;
  route: string;
  latencyMs: number | null;
  tokens: number | null;
  status: "success" | "error" | "unknown";
};

export type AdminFeedbackSection = {
  positivePct: number | null;
  negativePct: number | null;
  topIssues: Array<{ label: string; count: number }>;
  source: "supabase" | "unavailable";
};

export type AdminOverviewPayload = {
  fetchedAt: string;
  overview: AdminOverviewKpis;
  services: AdminServiceHealth[];
  router: AdminRouterSection;
  rag: AdminRagMetrics;
  inference: AdminInferenceSection;
  gpu: AdminGpuDevice[];
  recentRequests: AdminRecentRequest[];
  feedback: AdminFeedbackSection;
  sources: {
    prometheus: "ok" | "unconfigured" | "error";
    supabase: "ok" | "unconfigured" | "error";
  };
};
