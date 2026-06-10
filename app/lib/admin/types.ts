/** Normalized admin dashboard payload returned by GET /api/admin/overview. */

export type ServiceStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export type AdminServiceHealth = {
  id: string;
  name: string;
  status: ServiceStatus;
  version?: string | null;
  p50Ms?: number | null;
  detail?: string | null;
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

export type AdminLogEntry = {
  ts: string;
  tsNs: string;
  level: string;
  app: string;
  pod?: string;
  message: string;
  requestId?: string;
  sessionId?: string;
  userId?: string;
  traceId?: string;
  route?: string;
  latencyMs?: number | null;
  raw: string;
};

export type AdminLogsPayload = {
  fetchedAt: string;
  source: "loki" | "unconfigured" | "error";
  query: string;
  service: { id: string; name: string; app: string; namespace: string } | null;
  services: Array<{ id: string; name: string; app: string; namespace: string }>;
  entries: AdminLogEntry[];
  detail?: string | null;
};

export type ArgoCdSyncStatus = "Synced" | "OutOfSync" | "Unknown";
export type ArgoCdHealthStatus =
  | "Healthy"
  | "Degraded"
  | "Progressing"
  | "Missing"
  | "Suspended"
  | "Unknown";

export type AdminArgoCdAppSummary = {
  name: string;
  env: string;
  sync: ArgoCdSyncStatus;
  health: ArgoCdHealthStatus;
  imageSha: string | null;
  gitRevision: string | null;
  lastDeploy: string | null;
  lastDeployLabel: string | null;
  overlay: string | null;
  namespace: string | null;
  uiUrl: string;
};

export type AdminArgoCdAppDetail = AdminArgoCdAppSummary & {
  repoUrl: string | null;
  targetRevision: string | null;
  images: string[];
  healthMessage: string | null;
  syncRevision: string | null;
  history: Array<{ id: number; deployedAt: string; revision: string }>;
};

export type AdminArgoCdOverview = {
  fetchedAt: string;
  source: "argocd" | "unconfigured" | "error";
  apps: AdminArgoCdAppSummary[];
  syncedCount: number;
  healthyCount: number;
  totalCount: number;
  outOfSyncApps: string[];
  lastSyncLabel: string | null;
  uiBaseUrl?: string;
  detail?: string | null;
};
