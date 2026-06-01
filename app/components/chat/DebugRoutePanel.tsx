"use client";

import type { ChatMessage } from "@/lib/chat-types";

type Props = Pick<ChatMessage, "route" | "route_detail" | "route_source" | "model">;

export function DebugRoutePanel({ route, route_detail, route_source, model }: Props) {
  const name = route_detail?.name ?? route;
  if (!name && !route_detail?.reason && !model) {
    return <p className="chat-debug-empty">No routing metadata for this reply.</p>;
  }

  const confidence =
    route_detail?.confidence != null && Number.isFinite(route_detail.confidence)
      ? route_detail.confidence
      : null;

  return (
    <div className="chat-debug-kv-block">
      <p className="chat-details-section-label">Router</p>
      <dl className="chat-debug-dl">
        {name ? (
          <>
            <dt>Route</dt>
            <dd>
              <code className="chat-debug-code">{name}</code>
            </dd>
          </>
        ) : null}
        {route_detail?.type ? (
          <>
            <dt>Type</dt>
            <dd>{route_detail.type}</dd>
          </>
        ) : null}
        {confidence != null ? (
          <>
            <dt>Confidence</dt>
            <dd>{confidence.toFixed(2)}</dd>
          </>
        ) : null}
        {route_source ? (
          <>
            <dt>Source</dt>
            <dd>{route_source}</dd>
          </>
        ) : null}
        {model ? (
          <>
            <dt>Chat model</dt>
            <dd>{model}</dd>
          </>
        ) : null}
      </dl>
      {route_detail?.reason ? (
        <div className="chat-debug-reason">
          <p className="chat-debug-reason-label">Reason</p>
          <p className="chat-debug-reason-text">{route_detail.reason}</p>
        </div>
      ) : null}
    </div>
  );
}
