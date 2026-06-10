/**
 * Supabase REST queries for recent requests and feedback analytics (service role).
 */

import { adminConfig } from "@/lib/admin/config";
import type {
  AdminFeedbackSection,
  AdminRecentRequest,
  AdminRouterSection,
  AdminRagMetrics,
} from "@/lib/admin/types";

const FEEDBACK_REASON_LABELS: Record<string, string> = {
  not_factual: "Not factual",
  incomplete_instructions: "Didn't follow instructions",
  not_relevant: "Wrong language / not relevant",
  unsafe: "Offensive / unsafe",
  biased: "Biased",
  style_tone: "Style / tone",
  other: "Other",
};

type SupabaseRow = Record<string, unknown>;

async function supabaseGet(path: string): Promise<SupabaseRow[] | null> {
  const base = adminConfig.supabaseUrl;
  const key = adminConfig.supabaseServiceKey;
  if (!base || !key) return null;
  try {
    const res = await fetch(`${base}/rest/v1/${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(adminConfig.supabaseTimeoutMs),
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as SupabaseRow[];
  } catch {
    return null;
  }
}

function metadataObject(row: SupabaseRow): Record<string, unknown> {
  const meta = row.metadata;
  return meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
}

function latencyTotalMs(meta: Record<string, unknown>): number | null {
  const latency = meta.latency_ms;
  if (!latency || typeof latency !== "object" || Array.isArray(latency)) return null;
  const total = (latency as Record<string, unknown>).total;
  if (typeof total === "number" && Number.isFinite(total)) return Math.round(total);
  if (typeof total === "string") {
    const n = Number(total);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
}

function usageTokens(meta: Record<string, unknown>): number | null {
  const usage = meta.usage;
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return null;
  const u = usage as Record<string, unknown>;
  for (const key of ["total_tokens", "completion_tokens"]) {
    const v = u[key];
    if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  }
  return null;
}

function formatTime(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-US", { hour12: false });
}

/** Recent assistant messages for the requests table. */
export async function fetchRecentRequests(limit = 20): Promise<AdminRecentRequest[]> {
  const rows =
    (await supabaseGet(
      `messages?select=created_at,metadata,content&role=eq.assistant&order=created_at.desc&limit=${limit}`,
    )) ?? [];
  return rows.map((row) => {
    const meta = metadataObject(row);
    const route = typeof meta.route === "string" && meta.route.trim() ? meta.route.trim() : "unknown";
    const content = typeof row.content === "string" ? row.content : "";
    const isError =
      content.startsWith("Error:") ||
      content === "NOT_FOUND" ||
      content === "I couldn't find that in the knowledge base.";
    return {
      at: formatTime(row.created_at),
      route,
      latencyMs: latencyTotalMs(meta),
      tokens: usageTokens(meta),
      status: isError ? "error" : "success",
    };
  });
}

/** Route distribution from assistant message metadata (last 24h). */
export async function fetchRouteDistributionFromSupabase(): Promise<Record<string, number>> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const rows =
    (await supabaseGet(
      `messages?select=metadata&role=eq.assistant&created_at=gte.${encodeURIComponent(since)}&limit=1000`,
    )) ?? [];
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const meta = metadataObject(row);
    const route = typeof meta.route === "string" && meta.route.trim() ? meta.route.trim() : "unknown";
    counts[route] = (counts[route] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total <= 0) return {};
  const out: Record<string, number> = {};
  for (const [route, count] of Object.entries(counts)) {
    out[route] = Math.round((count / total) * 1000) / 10;
  }
  return out;
}

/** RAG hit rate: share of assistant answers that are not NOT_FOUND (last 24h). */
export async function fetchRagHitRate(): Promise<number | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const rows =
    (await supabaseGet(
      `messages?select=content,metadata&role=eq.assistant&created_at=gte.${encodeURIComponent(since)}&limit=1000`,
    )) ?? [];
  const ragRows = rows.filter((row) => {
    const meta = metadataObject(row);
    const route = typeof meta.route === "string" ? meta.route : "";
    return route.includes("rag");
  });
  if (ragRows.length === 0) return null;
  const hits = ragRows.filter((row) => {
    const content = typeof row.content === "string" ? row.content.trim() : "";
    return (
      content !== "NOT_FOUND" &&
      content !== "I couldn't find that in the knowledge base." &&
      !content.startsWith("Error:")
    );
  }).length;
  return Math.round((hits / ragRows.length) * 1000) / 10;
}

/** Feedback thumbs ratio and top negative reasons. */
export async function fetchFeedbackStats(): Promise<AdminFeedbackSection> {
  const unavailable: AdminFeedbackSection = {
    positivePct: null,
    negativePct: null,
    topIssues: [],
    source: "unavailable",
  };
  const rows =
    (await supabaseGet(
      "message_feedback?select=feedback,feedback_reason,metadata&order=created_at.desc&limit=500",
    )) ?? null;
  if (rows == null) return unavailable;

  let positive = 0;
  let negative = 0;
  const reasonCounts: Record<string, number> = {};

  for (const row of rows) {
    let rating: number | null = null;
    if (typeof row.feedback === "number") rating = row.feedback;
    const meta = metadataObject(row);
    if (rating == null && typeof meta.rating === "string") {
      if (meta.rating === "thumbs_up") rating = 1;
      if (meta.rating === "thumbs_down") rating = -1;
    }
    if (rating === 1) positive += 1;
    else if (rating === -1) {
      negative += 1;
      const reason = typeof row.feedback_reason === "string" ? row.feedback_reason : "other";
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
    }
  }

  const total = positive + negative;
  const topIssues = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key, count]) => ({
      label: FEEDBACK_REASON_LABELS[key] ?? key.replace(/_/g, " "),
      count,
    }));

  return {
    positivePct: total > 0 ? Math.round((positive / total) * 1000) / 10 : null,
    negativePct: total > 0 ? Math.round((negative / total) * 1000) / 10 : null,
    topIssues,
    source: "supabase",
  };
}

export type SupabaseBundle = {
  source: "ok" | "unconfigured" | "error";
  recentRequests: AdminRecentRequest[];
  feedback: AdminFeedbackSection;
  routerPatch: Partial<AdminRouterSection>;
  ragPatch: Partial<AdminRagMetrics>;
};

/** Load Supabase-backed analytics sections. */
export async function fetchSupabaseBundle(): Promise<SupabaseBundle> {
  if (!adminConfig.supabaseUrl || !adminConfig.supabaseServiceKey) {
    return {
      source: "unconfigured",
      recentRequests: [],
      feedback: { positivePct: null, negativePct: null, topIssues: [], source: "unavailable" },
      routerPatch: {},
      ragPatch: { source: "unavailable" },
    };
  }

  try {
    const [recentRequests, distribution, hitRate, feedback] = await Promise.all([
      fetchRecentRequests(),
      fetchRouteDistributionFromSupabase(),
      fetchRagHitRate(),
      fetchFeedbackStats(),
    ]);
    return {
      source: "ok",
      recentRequests,
      feedback,
      routerPatch: {
        distribution,
        distributionSource: Object.keys(distribution).length ? "supabase" : "unavailable",
      },
      ragPatch: {
        hitRate,
        source: hitRate != null ? "supabase" : "unavailable",
      },
    };
  } catch {
    return {
      source: "error",
      recentRequests: [],
      feedback: { positivePct: null, negativePct: null, topIssues: [], source: "unavailable" },
      routerPatch: {},
      ragPatch: { source: "unavailable" },
    };
  }
}
