"use client";

import { formatLatencyShort } from "@/lib/latency-timeline";
import { isLatencyObject, latencyDisplayTotalMs } from "@/lib/chat-latency";
import { citationTitle } from "@/lib/citations";
import type { ChatCitation, ChatMessage } from "@/lib/chat-types";
import { grafanaTraceUrl, huntaiGitHubUrl, langsmithTraceUrl } from "@/lib/debug-links";

type Props = {
  msg: ChatMessage;
};

function primarySourceLabel(citations: ChatCitation[] | undefined): string | null {
  if (!citations?.length) return null;
  return citationTitle(citations[0], 0);
}

export function AssistantAnswerSummary({ msg }: Props) {
  const routeLabel = msg.route_detail?.name ?? msg.route;
  const latencyTotal =
    msg.latency_ms && isLatencyObject(msg.latency_ms)
      ? latencyDisplayTotalMs(msg.latency_ms)
      : null;
  const source = primarySourceLabel(msg.citations);
  const traceId = msg.trace_id ?? msg.run_id;
  const langsmith = langsmithTraceUrl(traceId);
  const grafana = grafanaTraceUrl(traceId);

  const hasMeta =
    routeLabel ||
    source ||
    (latencyTotal != null && latencyTotal > 0) ||
    msg.model ||
    langsmith ||
    grafana;

  if (!hasMeta) return null;

  return (
    <div className="chat-answer-summary">
      <dl className="chat-answer-summary-grid">
        {routeLabel ? (
          <>
            <dt>Route</dt>
            <dd>{routeLabel}</dd>
          </>
        ) : null}
        {source ? (
          <>
            <dt>Source</dt>
            <dd>{source}</dd>
          </>
        ) : null}
        {latencyTotal != null && latencyTotal > 0 ? (
          <>
            <dt>Latency</dt>
            <dd>{formatLatencyShort(latencyTotal)}</dd>
          </>
        ) : null}
        {msg.model ? (
          <>
            <dt>Model</dt>
            <dd>{msg.model}</dd>
          </>
        ) : null}
      </dl>
      <div className="chat-debug-external-links">
        {langsmith ? (
          <a href={langsmith} target="_blank" rel="noreferrer" className="chat-debug-link-btn">
            LangSmith
          </a>
        ) : null}
        {grafana ? (
          <a href={grafana} target="_blank" rel="noreferrer" className="chat-debug-link-btn">
            Grafana
          </a>
        ) : null}
        <a href={huntaiGitHubUrl()} target="_blank" rel="noreferrer" className="chat-debug-link-btn">
          GitHub
        </a>
      </div>
    </div>
  );
}
