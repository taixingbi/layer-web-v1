"use client";

import { useId, useState } from "react";
import { CitationSourceList } from "@/components/chat/CitationSourceList";
import { LatencyTimelinePanel } from "@/components/chat/LatencyTimelinePanel";
import { buildLatencyTimelineView, formatLatencyShort } from "@/lib/latency-timeline";
import { isLatencyObject, latencyDisplayTotalMs, type LatencyObject } from "@/lib/chat-latency";
import type { ChatCitation } from "@/lib/chat-types";

const REWRITE_VALUE = "__rewrite__";
const SOURCES_VALUE = "__sources__";
const LATENCY_VALUE = "__latency__";

type DetailPanel = "rewrite" | "sources" | "latency";

type Props = {
  rewrite?: string;
  follow_up_questions?: string[];
  citations?: ChatCitation[];
  latency_ms?: LatencyObject;
  loading?: boolean;
  onFollowUp: (q: string) => void;
};

function buildDetailsPlaceholder(
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
  const selectId = useId();
  const [panel, setPanel] = useState<DetailPanel | null>(null);

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

  const placeholder = buildDetailsPlaceholder(
    citeCount,
    latencyTotal,
    hasRewrite,
    followUpCount,
  );
  const hasSourcesOrLatency = hasSources || hasLatency;

  return (
    <div className="chat-follow-up-section">
      <label htmlFor={selectId} className="chat-follow-up-label">
        Details
      </label>
      <select
        id={selectId}
        className="chat-follow-up-select"
        value={panel ? panelValue(panel) : ""}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) {
            setPanel(null);
            return;
          }
          if (v === REWRITE_VALUE) {
            setPanel("rewrite");
            return;
          }
          if (v === SOURCES_VALUE) {
            setPanel("sources");
            return;
          }
          if (v === LATENCY_VALUE) {
            setPanel("latency");
            return;
          }
          if (loading) {
            setPanel(null);
            return;
          }
          setPanel(null);
          onFollowUp(v);
        }}
      >
        <option value="">{panel ? "Hide details" : placeholder}</option>
        {hasRewrite ? (
          <optgroup label="Rewrite">
            <option value={REWRITE_VALUE}>{rewriteText}</option>
          </optgroup>
        ) : null}
        {hasFollowUps ? (
          <optgroup label="Follow-up">
            {follow_up_questions!.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </optgroup>
        ) : null}
        {hasSourcesOrLatency ? (
          <optgroup label="Sources & latency">
            {hasSources ? (
              <option value={SOURCES_VALUE}>
                {citeCount} source{citeCount === 1 ? "" : "s"}
              </option>
            ) : null}
            {hasLatency ? (
              <option value={LATENCY_VALUE}>
                Request timeline
                {latencyTotal != null && latencyTotal > 0
                  ? ` (${formatLatencyShort(latencyTotal)})`
                  : ""}
              </option>
            ) : null}
          </optgroup>
        ) : null}
      </select>

      {panel ? (
        <div className="chat-assistant-meta-body">
          {panel === "rewrite" ? (
            <p className="chat-details-rewrite">{rewriteText}</p>
          ) : null}
          {panel === "sources" && hasSources ? (
            <CitationSourceList citations={citations!} />
          ) : null}
          {panel === "latency" && hasLatency ? (
            <LatencyTimelinePanel latency_ms={latency_ms!} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function panelValue(panel: DetailPanel): string {
  if (panel === "rewrite") return REWRITE_VALUE;
  if (panel === "sources") return SOURCES_VALUE;
  return LATENCY_VALUE;
}
