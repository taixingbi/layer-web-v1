"use client";

import { PHASE_QUERY_EMBEDDING } from "@/lib/timeline-phase-labels";

type Props = {
  embedModel?: string;
};

export function DebugEmbedPanel({ embedModel }: Props) {
  const model = embedModel?.trim();

  return (
    <div className="chat-debug-kv-block">
      <p className="chat-details-section-label">{PHASE_QUERY_EMBEDDING}</p>
      {model ? (
        <dl className="chat-debug-dl">
          <dt>Model</dt>
          <dd>{model}</dd>
        </dl>
      ) : null}
    </div>
  );
}
