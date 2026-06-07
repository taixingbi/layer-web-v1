"use client";

export function DebugEmbedPanel() {
  return (
    <div className="chat-debug-kv-block">
      <p className="chat-details-section-label">Embed</p>
      <dl className="chat-debug-dl">
        <dt>Phase</dt>
        <dd>Query embedding</dd>
      </dl>
      <p className="chat-debug-reason-text">
        Vectorizes the rewritten question for hybrid retrieval.
      </p>
    </div>
  );
}
