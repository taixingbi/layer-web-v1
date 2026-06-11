"use client";

import type { ChatCitation } from "@/lib/chat-types";
import { citationExcerpt, citationTitle } from "@/lib/citations";
import { formatTokenLine, phaseUsageSlice } from "@/lib/chat-usage";
import { chatPhaseLabel } from "@/lib/timeline-phase-labels";
import { chatUsageToolKey } from "@/lib/timeline-hover";

type Props = {
  nodeId: string;
  model?: string;
  usage?: Record<string, unknown>;
  citations?: ChatCitation[];
};

function citationHoverText(c: ChatCitation, index: number): string {
  return citationExcerpt(c) ?? citationTitle(c, index);
}

export function DebugChatPanel({ nodeId, model, usage, citations = [] }: Props) {
  const tokens = phaseUsageSlice(usage, chatUsageToolKey(nodeId), "chat");
  const tokenLine = tokens ? formatTokenLine(tokens) : null;
  const citationLines = citations
    .map((c, i) => citationHoverText(c, i))
    .filter((line) => line.trim().length > 0);

  if (!model?.trim() && !tokenLine && citationLines.length === 0) {
    return <p className="chat-debug-empty">No chat metadata for this reply.</p>;
  }

  return (
    <div className="chat-debug-kv-block">
      <p className="chat-details-section-label">{chatPhaseLabel(nodeId)}</p>
      <dl className="chat-debug-dl">
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
        {citationLines.length > 0 ? (
          <>
            <dt>Citations</dt>
            <dd>
              <ul className="chat-debug-citation-list">
                {citationLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
