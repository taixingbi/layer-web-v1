"use client";

import { useMemo, useState } from "react";
import { CitationSourceList } from "@/components/chat/CitationSourceList";
import { LatencyTimelinePanel } from "@/components/chat/LatencyTimelinePanel";
import { buildLatencyTimelineView, formatLatencyShort } from "@/lib/latency-timeline";
import { hasUsageTokens } from "@/lib/chat-usage";
import { isLatencyObject, latencyDisplayTotalMs, type LatencyObject } from "@/lib/chat-latency";
import type { ChatMessage } from "@/lib/chat-types";

type DebugTab = "sources" | "execution";

type Props = {
  msg: ChatMessage;
};

function buildDetailsSummary(
  citationCount: number,
  latencyMs: number | null,
  hasUsage: boolean,
): string {
  const parts: string[] = [];
  if (citationCount > 0) {
    parts.push(`${citationCount} source${citationCount === 1 ? "" : "s"}`);
  }
  if (latencyMs != null && latencyMs > 0) {
    parts.push(`${formatLatencyShort(latencyMs)} latency`);
  }
  if (hasUsage) parts.push("usage");
  return parts.length > 0 ? parts.join(" · ") : "Details…";
}

function defaultTab(hasSources: boolean, hasExecution: boolean): DebugTab {
  if (hasSources) return "sources";
  if (hasExecution) return "execution";
  return "sources";
}

export function AssistantMessageMeta({ msg }: Props) {
  const citeCount = msg.citations?.length ?? 0;
  const hasSources = citeCount > 0;
  const latencyTotal =
    msg.latency_ms && isLatencyObject(msg.latency_ms) ? latencyDisplayTotalMs(msg.latency_ms) : null;
  const hasLatencyTree = Boolean(
    msg.latency_ms && isLatencyObject(msg.latency_ms) && buildLatencyTimelineView(msg.latency_ms),
  );
  const hasRoute = Boolean(msg.route || msg.route_detail);
  const hasExecution = hasLatencyTree || hasRoute;
  const hasMeta = hasSources || hasExecution;

  const initialTab = useMemo(
    () => defaultTab(hasSources, hasExecution),
    [hasSources, hasExecution],
  );
  const [tab, setTab] = useState<DebugTab>(initialTab);

  if (!hasMeta) return null;

  const summary = buildDetailsSummary(citeCount, latencyTotal, hasUsageTokens(msg.usage));

  const allTabs = [
    { id: "sources", label: "Sources", show: hasSources },
    { id: "execution", label: "Execution", show: hasExecution },
  ] satisfies Array<{ id: DebugTab; label: string; show: boolean }>;

  const tabs = allTabs.filter((t) => t.show);
  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;

  return (
    <div className="chat-debug-wrap">
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

          {tabs.length > 0 ? (
            <div className="chat-debug-tab-panel" role="tabpanel">
              {activeTab === "sources" && hasSources ? (
                <CitationSourceList citations={msg.citations!} />
              ) : null}
              {activeTab === "execution" && hasExecution ? (
                <LatencyTimelinePanel
                  latency_ms={hasLatencyTree ? (msg.latency_ms as LatencyObject) : undefined}
                  route={msg.route}
                  route_detail={msg.route_detail}
                  route_source={msg.route_source}
                  model={msg.model}
                  usage={msg.usage}
                  citations={msg.citations}
                  traceMsg={msg}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
