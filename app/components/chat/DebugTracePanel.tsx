"use client";

import { useCallback, useState } from "react";
import type { ChatMessage } from "@/lib/chat-types";
import { UsageTimelinePanel } from "@/components/chat/UsageTimelinePanel";
import { debugBundleJson } from "@/lib/debug-bundle";
import { grafanaTraceUrl, huntaiGitHubUrl, langsmithTraceUrl } from "@/lib/debug-links";
import { hasUsageTokens } from "@/lib/chat-usage";

type Props = {
  msg: ChatMessage;
};

function IdRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value?.trim()) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>
        <code className="chat-debug-code">{value}</code>
      </dd>
    </>
  );
}

export function DebugTracePanel({ msg }: Props) {
  const [copied, setCopied] = useState(false);
  const traceId = msg.trace_id ?? msg.run_id;
  const langsmith = langsmithTraceUrl(traceId);
  const grafana = grafanaTraceUrl(traceId);
  const showUsageTree = hasUsageTokens(msg.usage);

  const onCopyBundle = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(debugBundleJson(msg));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [msg]);

  const hasIds = Boolean(
    traceId || msg.request_id || msg.session_id || msg.conversation_id,
  );

  return (
    <div className="chat-debug-trace-panel">
      {showUsageTree ? <UsageTimelinePanel usage={msg.usage} /> : null}

      {hasIds ? (
        <dl className={`chat-debug-dl${showUsageTree ? " chat-debug-dl-spaced" : ""}`}>
          <IdRow label="trace_id" value={traceId} />
          <IdRow label="request_id" value={msg.request_id} />
          <IdRow label="session_id" value={msg.session_id} />
          <IdRow label="conversation_id" value={msg.conversation_id} />
        </dl>
      ) : showUsageTree ? null : (
        <p className="chat-debug-empty">No token usage for this reply.</p>
      )}

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
        <button type="button" className="chat-debug-link-btn" onClick={onCopyBundle}>
          {copied ? "Copied" : "Copy debug bundle"}
        </button>
      </div>
    </div>
  );
}
