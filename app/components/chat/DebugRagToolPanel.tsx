"use client";

import { formatDebugKvLine } from "@/lib/debug-kv-format";
import {
  asRagEnvelope,
  toolRagLatencyMs,
  totalUsageTokens,
  type RagEnvelope,
} from "@/lib/rag-envelope";

type Props = {
  route?: string;
  rag?: RagEnvelope | Record<string, unknown> | null;
  latency_ms?: Record<string, unknown>;
  usage?: Record<string, unknown>;
};

export function DebugRagToolPanel({ route, rag: ragRaw, latency_ms, usage }: Props) {
  const rag = asRagEnvelope(ragRaw);
  const retrieval = rag?.retrieval;
  const routeLabel = route?.trim() || "rag_private_kb";

  const lines: string[] = [];
  lines.push(formatDebugKvLine("Route", routeLabel));

  if (rag?.collection) {
    lines.push(formatDebugKvLine("Collection", rag.collection));
  }

  if (
    retrieval?.retrieved_chunks != null &&
    retrieval?.reranked_chunks != null &&
    retrieval?.context_chunks != null
  ) {
    lines.push(
      formatDebugKvLine(
        "Retrieve",
        `${retrieval.retrieved_chunks} → ${retrieval.reranked_chunks} → ${retrieval.context_chunks} chunks`,
      ),
    );
  }

  if (typeof retrieval?.context_tokens === "number" && retrieval.context_tokens > 0) {
    lines.push(formatDebugKvLine("Context", `${retrieval.context_tokens} tok`));
  }

  const latency = toolRagLatencyMs(latency_ms);
  if (latency != null && latency > 0) {
    lines.push(formatDebugKvLine("Latency", `${latency} ms`));
  }

  const tokens = totalUsageTokens(usage);
  if (tokens != null && tokens > 0) {
    lines.push(formatDebugKvLine("Tokens", `${tokens} tok`));
  }

  if (lines.length <= 1 && !rag?.collection) {
    return <p className="chat-debug-empty">No RAG metadata for this reply.</p>;
  }

  return (
    <div className="chat-debug-kv-block">
      <p className="chat-details-section-label">RAG</p>
      <pre className="chat-debug-kv-pre">{lines.join("\n")}</pre>
    </div>
  );
}
