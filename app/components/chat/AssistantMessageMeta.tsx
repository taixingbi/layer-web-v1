"use client";

import { CitationSourceList } from "@/components/chat/CitationSourceList";
import { LatencyTimelinePanel } from "@/components/chat/LatencyTimelinePanel";
import { buildLatencyTimelineView, formatLatencyShort } from "@/lib/latency-timeline";
import { isLatencyObject, latencyDisplayTotalMs, type LatencyObject } from "@/lib/chat-latency";
import type { ChatCitation } from "@/lib/chat-types";

type Props = {
  rewrite?: string;
  follow_up_questions?: string[];
  citations?: ChatCitation[];
  latency_ms?: LatencyObject;
  loading?: boolean;
  onFollowUp: (q: string) => void;
};

function buildDetailsSummary(
  citationCount: number,
  latencyMs: number | null,
  hasRewrite: boolean,
  followUpCount: number,
): string {
  const parts: string[] = [];
  if (citationCount > 0) {
    parts.push(`${citationCount} source${citationCount === 1 ? "" : "s"}`);
  }
  if (latencyMs != null && latencyMs > 0) {
    parts.push(`${formatLatencyShort(latencyMs)} latency`);
  }
  if (hasRewrite) {
    parts.push("rewrite");
  }
  if (followUpCount > 0) {
    parts.push(`${followUpCount} follow-up${followUpCount === 1 ? "" : "s"}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Details…";
}

export function AssistantMessageMeta({
  rewrite,
  follow_up_questions,
  citations,
  latency_ms,
  loading = false,
  onFollowUp,
}: Props) {
  const citeCount = citations?.length ?? 0;
  const followUpCount = follow_up_questions?.length ?? 0;
  const rewriteText = rewrite?.trim() ?? "";
  const hasRewrite = Boolean(rewriteText);
  const hasFollowUps = followUpCount > 0;
  const hasSources = citeCount > 0;
  const latencyTotal =
    latency_ms && isLatencyObject(latency_ms) ? latencyDisplayTotalMs(latency_ms) : null;
  const hasLatency = Boolean(
    latency_ms && isLatencyObject(latency_ms) && buildLatencyTimelineView(latency_ms),
  );
  const hasMeta = hasRewrite || hasFollowUps || hasSources || hasLatency;

  if (!hasMeta) return null;

  const summary = buildDetailsSummary(
    citeCount,
    latencyTotal,
    hasRewrite,
    followUpCount,
  );

  return (
    <details className="chat-details-disclosure chat-assistant-meta group">
      <summary className="chat-details-trigger chat-assistant-meta-summary">
        <span className="chat-assistant-meta-chevron" aria-hidden>
          ▶
        </span>
        {summary}
      </summary>
      <div className="chat-assistant-meta-body">
        {hasRewrite ? (
          <section className="chat-details-section">
            <p className="chat-details-section-label">Rewrite</p>
            <p className="chat-details-rewrite">{rewriteText}</p>
          </section>
        ) : null}

        {hasFollowUps ? (
          <section className="chat-details-section">
            <p className="chat-details-section-label">Follow-up</p>
            <ul className="chat-details-follow-up-list">
              {follow_up_questions!.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    disabled={loading}
                    className="chat-details-follow-up-btn"
                    onClick={() => onFollowUp(q)}
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {hasSources ? (
          <section className="chat-details-section">
            <p className="chat-details-section-label">
              Sources ({citeCount})
            </p>
            <CitationSourceList citations={citations!} />
          </section>
        ) : null}

        {hasLatency ? (
          <section className="chat-details-section">
            <LatencyTimelinePanel latency_ms={latency_ms!} />
          </section>
        ) : null}
      </div>
    </details>
  );
}
