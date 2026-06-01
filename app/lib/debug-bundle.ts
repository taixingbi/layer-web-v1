import type { ChatMessage } from "@/lib/chat-types";
import { isLatencyObject, latencyDisplayTotalMs } from "@/lib/chat-latency";

/** JSON debug payload engineers can paste into tickets. */
export function buildDebugBundle(msg: ChatMessage): Record<string, unknown> {
  const latencyTotal =
    msg.latency_ms && isLatencyObject(msg.latency_ms)
      ? latencyDisplayTotalMs(msg.latency_ms)
      : null;

  const sourceNames = (msg.citations ?? [])
    .map((c) => {
      if (typeof c.source === "string" && c.source.trim()) return c.source.trim();
      if (typeof c.title === "string" && c.title.trim()) return c.title.trim();
      return null;
    })
    .filter((s): s is string => Boolean(s));

  return {
    trace_id: msg.trace_id ?? msg.run_id ?? null,
    request_id: msg.request_id ?? null,
    session_id: msg.session_id ?? null,
    conversation_id: msg.conversation_id ?? null,
    route: msg.route ?? msg.route_detail?.name ?? null,
    route_detail: msg.route_detail ?? null,
    route_source: msg.route_source ?? null,
    model: msg.model ?? null,
    latency_ms: msg.latency_ms ?? null,
    latency_total_ms: latencyTotal,
    sources: sourceNames,
    rewrite: msg.rewrite ?? null,
    follow_up_questions: msg.follow_up_questions ?? [],
    usage: msg.usage ?? null,
    answer_preview:
      msg.content.trim().length > 240
        ? `${msg.content.trim().slice(0, 240)}…`
        : msg.content.trim() || null,
  };
}

export function debugBundleJson(msg: ChatMessage): string {
  return JSON.stringify(buildDebugBundle(msg), null, 2);
}
