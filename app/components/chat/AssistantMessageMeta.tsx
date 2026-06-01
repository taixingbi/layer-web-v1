"use client";

import { useMemo, useState } from "react";
import { AssistantAnswerSummary } from "@/components/chat/AssistantAnswerSummary";
import { CitationSourceList } from "@/components/chat/CitationSourceList";
import { DebugRoutePanel } from "@/components/chat/DebugRoutePanel";
import { DebugTracePanel } from "@/components/chat/DebugTracePanel";
import { LatencyTimelinePanel } from "@/components/chat/LatencyTimelinePanel";
import { buildLatencyTimelineView, formatLatencyShort } from "@/lib/latency-timeline";
import { isLatencyObject, latencyDisplayTotalMs, type LatencyObject } from "@/lib/chat-latency";
import type { ChatMessage } from "@/lib/chat-types";

type DebugTab = "sources" | "trace" | "route" | "timeline" | "rewrite";

type Props = {
  msg: ChatMessage;
  loading?: boolean;
  onFollowUp: (q: string) => void;
  /** When false, hide the inline answer summary (parent may render it). */
  showAnswerSummary?: boolean;
};

function buildDetailsSummary(
  citationCount: number,
  latencyMs: number | null,
  hasRewrite: boolean,
  followUpCount: number,
  hasTrace: boolean,
): string {
  const parts: string[] = [];
  if (citationCount > 0) {
    parts.push(`${citationCount} source${citationCount === 1 ? "" : "s"}`);
  }
  if (latencyMs != null && latencyMs > 0) {
    parts.push(`${formatLatencyShort(latencyMs)} latency`);
  }
  if (hasRewrite) parts.push("rewrite");
  if (followUpCount > 0) {
    parts.push(`${followUpCount} follow-up${followUpCount === 1 ? "" : "s"}`);
  }
  if (hasTrace) parts.push("trace");
  return parts.length > 0 ? parts.join(" · ") : "Details…";
}

function defaultTab(msg: ChatMessage, hasSources: boolean, hasLatency: boolean): DebugTab {
  if (hasSources) return "sources";
  if (msg.trace_id || msg.run_id || msg.usage) return "trace";
  if (msg.route || msg.route_detail) return "route";
  if (hasLatency) return "timeline";
  if (msg.rewrite?.trim()) return "rewrite";
  return "sources";
}

export function AssistantMessageMeta({
  msg,
  loading = false,
  onFollowUp,
  showAnswerSummary = false,
}: Props) {
  const citeCount = msg.citations?.length ?? 0;
  const followUpCount = msg.follow_up_questions?.length ?? 0;
  const rewriteText = msg.rewrite?.trim() ?? "";
  const hasRewrite = Boolean(rewriteText);
  const hasFollowUps = followUpCount > 0;
  const hasSources = citeCount > 0;
  const latencyTotal =
    msg.latency_ms && isLatencyObject(msg.latency_ms) ? latencyDisplayTotalMs(msg.latency_ms) : null;
  const hasLatency = Boolean(
    msg.latency_ms && isLatencyObject(msg.latency_ms) && buildLatencyTimelineView(msg.latency_ms),
  );
  const hasTrace = Boolean(
    msg.trace_id || msg.run_id || msg.request_id || msg.session_id || msg.conversation_id || msg.usage,
  );
  const hasRoute = Boolean(msg.route || msg.route_detail);
  const hasMeta =
    hasRewrite || hasFollowUps || hasSources || hasLatency || hasTrace || hasRoute;

  const initialTab = useMemo(
    () => defaultTab(msg, hasSources, Boolean(hasLatency)),
    [msg, hasSources, hasLatency],
  );
  const [tab, setTab] = useState<DebugTab>(initialTab);

  if (!hasMeta) return null;

  const summary = buildDetailsSummary(
    citeCount,
    latencyTotal,
    hasRewrite,
    followUpCount,
    hasTrace,
  );

  const tabs: Array<{ id: DebugTab; label: string; show: boolean }> = [
    { id: "sources", label: "Sources", show: hasSources },
    { id: "trace", label: "Trace", show: hasTrace },
    { id: "route", label: "Route", show: hasRoute },
    { id: "timeline", label: "Timeline", show: Boolean(hasLatency) },
    { id: "rewrite", label: "Rewrite", show: hasRewrite },
  ].filter((t) => t.show);

  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;

  return (
    <div className="chat-debug-wrap">
      {showAnswerSummary ? <AssistantAnswerSummary msg={msg} /> : null}

      <details className="chat-details-disclosure chat-assistant-meta group">
        <summary className="chat-details-trigger chat-assistant-meta-summary">
          <span className="chat-assistant-meta-chevron" aria-hidden>
            ▶
          </span>
          {summary}
        </summary>
        <div className="chat-assistant-meta-body chat-debug-panel-body">
          {tabs.length > 1 ? (
            <div className="chat-debug-tabs" role="tablist" aria-label="Debug sections">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.id}
                  className={`chat-debug-tab ${activeTab === t.id ? "is-active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="chat-debug-tab-panel" role="tabpanel">
            {activeTab === "sources" && hasSources ? (
              <CitationSourceList citations={msg.citations!} />
            ) : null}
            {activeTab === "trace" && hasTrace ? <DebugTracePanel msg={msg} /> : null}
            {activeTab === "route" && hasRoute ? (
              <DebugRoutePanel
                route={msg.route}
                route_detail={msg.route_detail}
                route_source={msg.route_source}
                model={msg.model}
              />
            ) : null}
            {activeTab === "timeline" && hasLatency ? (
              <LatencyTimelinePanel latency_ms={msg.latency_ms as LatencyObject} />
            ) : null}
            {activeTab === "rewrite" && hasRewrite ? (
              <p className="chat-details-rewrite">{rewriteText}</p>
            ) : null}
          </div>
        </div>
      </details>

      {hasFollowUps ? (
        <section className="chat-related-questions">
          <p className="chat-details-section-label">Related questions</p>
          <ul className="chat-details-follow-up-list">
            {msg.follow_up_questions!.map((q) => (
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
    </div>
  );
}
