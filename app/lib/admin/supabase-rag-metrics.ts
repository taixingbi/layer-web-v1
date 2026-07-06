/**
 * Derive RAG phase P50s and context size from Supabase ``messages.metadata``.
 */

import type { AdminRagMetrics } from "@/lib/admin/types";

export type RagLatencySample = {
  embedMs: number | null;
  retrievalMs: number | null;
  rerankMs: number | null;
  contextSize: number | null;
};

function latencyMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** True when metadata row is a RAG-backed assistant turn. */
export function isRagMessageMeta(meta: Record<string, unknown>): boolean {
  const route = typeof meta.route === "string" ? meta.route.toLowerCase() : "";
  if (route.includes("rag")) return true;
  if (route === "rag_private_kb") return true;

  if (isRecord(meta.route_meta)) {
    const tool = meta.route_meta.tool;
    if (typeof tool === "string" && tool.toLowerCase().includes("rag")) return true;
    const intent = meta.route_meta.intent;
    if (typeof intent === "string" && intent.toLowerCase().includes("rag")) return true;
  }

  if (isRecord(meta.tool_meta)) {
    const key = meta.tool_meta.key;
    if (key === "tool_rag") return true;
    const name = meta.tool_meta.name;
    if (typeof name === "string" && name.toLowerCase().includes("rag")) return true;
  }

  return false;
}

function toolRagBlock(latency: Record<string, unknown>): Record<string, unknown> | null {
  const direct = latency.tool_rag;
  if (isRecord(direct)) return direct;

  const orchestrator = latency.orchestrator;
  if (isRecord(orchestrator)) {
    const workflow = orchestrator.workflow;
    if (isRecord(workflow)) {
      const nested = workflow.tool_rag;
      if (isRecord(nested)) return nested;
      // Legacy: workflow is flat tool timings
      if (workflow.embed != null || workflow.retrieve != null || workflow.retrieve_rerank != null) {
        return workflow;
      }
    }
  }

  return null;
}

function contextChunksFromMeta(meta: Record<string, unknown>): number | null {
  if (isRecord(meta.tool_meta) && isRecord(meta.tool_meta.retrieval)) {
    const n = latencyMs(meta.tool_meta.retrieval.context_chunks);
    if (n != null) return n;
  }
  if (isRecord(meta.rag) && isRecord(meta.rag.retrieval)) {
    const n = latencyMs(meta.rag.retrieval.context_chunks);
    if (n != null) return n;
  }
  const citations = meta.citations;
  if (Array.isArray(citations) && citations.length > 0) return citations.length;
  return null;
}

/** Extract per-request RAG timings from one assistant ``metadata`` object. */
export function ragLatencySampleFromMeta(meta: Record<string, unknown>): RagLatencySample | null {
  if (!isRagMessageMeta(meta)) return null;

  const latency = meta.latency_ms;
  if (!isRecord(latency)) {
    const contextOnly = contextChunksFromMeta(meta);
    return contextOnly != null
      ? { embedMs: null, retrievalMs: null, rerankMs: null, contextSize: contextOnly }
      : null;
  }

  const toolRag = toolRagBlock(latency);
  if (!toolRag) {
    const contextOnly = contextChunksFromMeta(meta);
    return contextOnly != null
      ? { embedMs: null, retrievalMs: null, rerankMs: null, contextSize: contextOnly }
      : null;
  }

  const embedMs = latencyMs(toolRag.embed);
  const retrieveMs = latencyMs(toolRag.retrieve) ?? latencyMs(toolRag.retrieve_rerank);
  const rerankMs =
    latencyMs(toolRag.rerank) ??
    (toolRag.retrieve == null && toolRag.retrieve_rerank != null
      ? null
      : latencyMs(toolRag.retrieve_rerank));

  const contextSize = contextChunksFromMeta(meta);

  if (embedMs == null && retrieveMs == null && rerankMs == null && contextSize == null) {
    return null;
  }

  return { embedMs, retrievalMs: retrieveMs, rerankMs, contextSize };
}

export function percentile50(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return Math.round(sorted[mid]!);
}

/** Aggregate P50 metrics from metadata rows (already parsed). */
export function aggregateRagMetricsFromMetaRows(
  rows: Array<Record<string, unknown>>,
): Partial<AdminRagMetrics> {
  const embeds: number[] = [];
  const retrievals: number[] = [];
  const reranks: number[] = [];
  const contexts: number[] = [];

  for (const row of rows) {
    const meta = isRecord(row.metadata) ? row.metadata : row;
    const sample = ragLatencySampleFromMeta(meta);
    if (!sample) continue;
    if (sample.embedMs != null) embeds.push(sample.embedMs);
    if (sample.retrievalMs != null) retrievals.push(sample.retrievalMs);
    if (sample.rerankMs != null) reranks.push(sample.rerankMs);
    if (sample.contextSize != null) contexts.push(sample.contextSize);
  }

  const retrievalP50Ms = percentile50(retrievals);
  const embedP50Ms = percentile50(embeds);
  const rerankP50Ms = percentile50(reranks);
  const contextSize = percentile50(contexts);

  const hasAny =
    retrievalP50Ms != null || embedP50Ms != null || rerankP50Ms != null || contextSize != null;

  if (!hasAny) {
    return { source: "unavailable" };
  }

  return {
    retrievalP50Ms,
    embedP50Ms,
    rerankP50Ms,
    contextSize,
    source: "supabase",
  };
}
