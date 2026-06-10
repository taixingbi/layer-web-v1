/** RAG tool metadata echoed on terminal responses (`rag` block). */

export type RagRetrievalMeta = {
  embed_model?: string;
  reranker_model?: string;
  top_k?: number;
  retrieved_chunks?: number;
  reranked_chunks?: number;
  context_chunks?: number;
  context_tokens?: number;
  top_score?: number;
  confidence?: string;
};

export type RagSearchSummary = {
  chunk_count?: number;
  sources?: string[];
};

export type RagNotFoundMeta = {
  search_summary?: RagSearchSummary;
  result?: string;
};

export type RagEnvelope = {
  collection?: string;
  query?: {
    original?: string;
    rewritten?: string;
  };
  retrieval?: RagRetrievalMeta;
  sources?: Array<{
    rank?: number;
    score?: number;
    source?: string;
    chunk_id?: string;
  }>;
  not_found?: RagNotFoundMeta;
};

export function ragNotFoundMeta(rag: RagEnvelope | null | undefined): RagNotFoundMeta | null {
  if (!rag?.not_found || typeof rag.not_found !== "object") return null;
  return rag.not_found;
}

export function asRagEnvelope(value: unknown): RagEnvelope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as RagEnvelope;
}

export function toolRagLatencyMs(latency_ms?: Record<string, unknown>): number | null {
  if (!latency_ms) return null;
  const nested = latency_ms.tool_rag ?? latency_ms.rag;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const total = (nested as Record<string, unknown>).total;
    if (typeof total === "number" && Number.isFinite(total)) return total;
  }
  const top = latency_ms.total;
  return typeof top === "number" && Number.isFinite(top) ? top : null;
}

function readTotalTokens(block: unknown): number | null {
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  const tok = (block as Record<string, unknown>).total_tokens;
  return typeof tok === "number" && Number.isFinite(tok) ? tok : null;
}

/** Prefer RAG tool usage; fall back to envelope total. */
export function totalUsageTokens(usage?: Record<string, unknown>): number | null {
  if (!usage) return null;
  const tool = usage.tool_rag ?? usage.rag;
  if (tool && typeof tool === "object" && !Array.isArray(tool)) {
    const toolTotal = readTotalTokens((tool as Record<string, unknown>).total);
    if (toolTotal != null) return toolTotal;
    const direct = readTotalTokens(tool);
    if (direct != null) return direct;
  }
  return readTotalTokens(usage.total);
}
