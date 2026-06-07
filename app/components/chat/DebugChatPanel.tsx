"use client";

import { formatTokenLine, phaseUsageSlice } from "@/lib/chat-usage";
import { chatUsageToolKey } from "@/lib/timeline-hover";

type Props = {
  nodeId: string;
  model?: string;
  usage?: Record<string, unknown>;
  citationCount?: number;
};

function chatPhaseLabel(nodeId: string): string {
  return nodeId.includes("github") ? "Answer generation" : "RAG answer generation";
}

export function DebugChatPanel({ nodeId, model, usage, citationCount = 0 }: Props) {
  const tokens = phaseUsageSlice(usage, chatUsageToolKey(nodeId), "chat");
  const tokenLine = tokens ? formatTokenLine(tokens) : null;
  const hasCitations = citationCount > 0;

  if (!model?.trim() && !tokenLine && !hasCitations) {
    return <p className="chat-debug-empty">No chat metadata for this reply.</p>;
  }

  return (
    <div className="chat-debug-kv-block">
      <p className="chat-details-section-label">Chat</p>
      <dl className="chat-debug-dl">
        <dt>Phase</dt>
        <dd>{chatPhaseLabel(nodeId)}</dd>
        {model?.trim() ? (
          <>
            <dt>Model</dt>
            <dd>{model.trim()}</dd>
          </>
        ) : null}
        {tokenLine ? (
          <>
            <dt>Tokens</dt>
            <dd>{tokenLine}</dd>
          </>
        ) : null}
        {hasCitations ? (
          <>
            <dt>Citations</dt>
            <dd>{citationCount}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
