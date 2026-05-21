"use client";

import { CitationSourceList } from "@/components/chat/CitationSourceList";
import { LatencyTimelinePanel } from "@/components/chat/LatencyTimelinePanel";
import { buildLatencyTimelineView, formatLatencyShort } from "@/lib/latency-timeline";
import { isLatencyObject, latencyDisplayTotalMs, type LatencyObject } from "@/lib/chat-latency";
import type { ChatCitation } from "@/lib/chat-types";

type Props = {
  citations?: ChatCitation[];
  latency_ms?: LatencyObject;
};

function buildMetaSummary(citationCount: number, latencyMs: number | null): string {
  const parts: string[] = [];
  if (citationCount > 0) {
    parts.push(`${citationCount} source${citationCount === 1 ? "" : "s"}`);
  }
  if (latencyMs != null && latencyMs > 0) {
    parts.push(`${formatLatencyShort(latencyMs)} latency`);
  }
  return parts.join(" · ");
}

export function AssistantMessageMeta({ citations, latency_ms }: Props) {
  const citeCount = citations?.length ?? 0;
  const latencyTotal =
    latency_ms && isLatencyObject(latency_ms) ? latencyDisplayTotalMs(latency_ms) : null;
  const hasLatency = latency_ms && isLatencyObject(latency_ms) && buildLatencyTimelineView(latency_ms);

  if (citeCount === 0 && !hasLatency) return null;

  const summary = buildMetaSummary(citeCount, latencyTotal);

  return (
    <details className="chat-assistant-meta group">
      <summary className="chat-assistant-meta-summary">
        <span className="chat-assistant-meta-chevron" aria-hidden>
          ▶
        </span>
        {summary}
      </summary>
      <div className="chat-assistant-meta-body">
        {citeCount > 0 ? <CitationSourceList citations={citations!} /> : null}
        {hasLatency ? <LatencyTimelinePanel latency_ms={latency_ms!} /> : null}
      </div>
    </details>
  );
}
