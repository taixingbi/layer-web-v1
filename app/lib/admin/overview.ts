/**
 * Aggregate admin dashboard JSON from health probes, Prometheus, and Supabase.
 */

import { fetchPrometheusBundle } from "@/lib/admin/prometheus";
import { fetchServiceHealth } from "@/lib/admin/service-health";
import { fetchSupabaseBundle } from "@/lib/admin/supabase-analytics";
import type { AdminOverviewPayload } from "@/lib/admin/types";
import { versionPayload } from "@/lib/build-info";

function defaultVersionLabel(): string {
  const v = versionPayload().version;
  return v.startsWith("v") ? v : `v${v}`;
}

/** Build the normalized dashboard payload for GET /api/admin/overview. */
export async function buildAdminOverview(): Promise<AdminOverviewPayload> {
  const [services, prom, supa] = await Promise.all([
    fetchServiceHealth(),
    fetchPrometheusBundle(),
    fetchSupabaseBundle(),
  ]);

  const routerDistribution =
    Object.keys(prom.router.distribution ?? {}).length > 0
      ? (prom.router.distribution ?? {})
      : (supa.routerPatch.distribution ?? {});

  const routerDistributionSource =
    Object.keys(prom.router.distribution ?? {}).length > 0
      ? prom.router.distributionSource ?? "prometheus"
      : supa.routerPatch.distributionSource ?? "unavailable";

  return {
    fetchedAt: new Date().toISOString(),
    overview: {
      usersOnline: prom.overview.usersOnline ?? null,
      requestsPerMinute: prom.overview.requestsPerMinute ?? null,
      successRate: prom.overview.successRate ?? null,
      avgLatencyMs: prom.overview.avgLatencyMs ?? null,
      gpuUtil: prom.overview.gpuUtil ?? null,
      version: prom.overview.version ?? defaultVersionLabel(),
    },
    services,
    router: {
      version: prom.router.version ?? "router-v2",
      accuracy: prom.router.accuracy ?? null,
      accuracySource: prom.router.accuracySource ?? "unavailable",
      evaluatedAt: prom.router.evaluatedAt ?? null,
      distribution: routerDistribution,
      distributionSource: routerDistributionSource,
    },
    rag: {
      retrievalP50Ms: prom.rag.retrievalP50Ms ?? null,
      embedP50Ms: prom.rag.embedP50Ms ?? null,
      rerankP50Ms: prom.rag.rerankP50Ms ?? null,
      contextSize: prom.rag.contextSize ?? null,
      hitRate: supa.ragPatch.hitRate ?? prom.rag.hitRate ?? null,
      source:
        prom.rag.source === "prometheus"
          ? "prometheus"
          : supa.ragPatch.source === "supabase"
            ? "supabase"
            : "unavailable",
    },
    inference: {
      runtime: prom.inference.runtime ?? "vLLM",
      workloads: prom.inference.workloads ?? [],
    },
    gpu: prom.gpu,
    recentRequests: supa.recentRequests,
    feedback: supa.feedback,
    sources: {
      prometheus: prom.source,
      supabase: supa.source,
    },
  };
}
