"use client";

const EMBED_PHASE = "Query embedding";

type Props = {
  embedModel?: string;
};

export function DebugEmbedPanel({ embedModel }: Props) {
  const model = embedModel?.trim();

  return (
    <div className="chat-debug-kv-block">
      <p className="chat-details-section-label">{EMBED_PHASE}</p>
      {model ? (
        <dl className="chat-debug-dl">
          <dt>Model</dt>
          <dd>{model}</dd>
        </dl>
      ) : null}
    </div>
  );
}
