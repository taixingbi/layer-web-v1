/**
 * Translate layer-gateway-api-v1 SSE (`meta`, `token`, `error`, `done`) into the
 * shapes expected by `app/chat/page.tsx` (`status`, `result_chunk`, `error`, `stream_end`).
 */

import type { RouteDetail } from "@/lib/chat-types";

/** Correlation ids from gateway SSE ``meta`` events. */
export type GatewayMeta = {
  request_id?: string;
  trace_id?: string;
  session_id?: string;
  conversation_id?: string;
  is_new_conversation?: boolean;
  assistant_message_id?: string;
  model?: string;
  route?: string;
};

/** Parse one SSE block (``event:`` + ``data:`` lines) from gateway upstream. */
export function parseSseBlock(block: string): { event: string; dataRaw: string } | null {
  const lines = block.split("\n").filter((l) => l.length > 0);
  let eventName = "message";
  const dataParts: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataParts.push(line.slice(5).trim());
    }
  }
  if (dataParts.length === 0) return null;
  return { event: eventName, dataRaw: dataParts.join("\n") };
}

/** Extract streamed token text from a gateway ``token`` event JSON payload. */
export function tokenDeltaFromGatewayData(dataRaw: string): string {
  try {
    const obj = JSON.parse(dataRaw) as { text?: unknown; token?: unknown };
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.token === "string") return obj.token;
    return "";
  } catch {
    return "";
  }
}

/** Extract user-facing error message from gateway ``error`` event JSON. */
export function errorMessageFromGatewayData(dataRaw: string): string {
  try {
    const obj = JSON.parse(dataRaw) as { error?: { message?: string }; message?: string };
    if (obj.error && typeof obj.error.message === "string") return obj.error.message;
    if (typeof obj.message === "string") return obj.message;
    return dataRaw;
  } catch {
    return dataRaw;
  }
}

/** Parse request/trace/session ids from gateway ``meta`` event JSON. */
export function metaFromGatewayData(dataRaw: string): GatewayMeta {
  try {
    const obj = JSON.parse(dataRaw) as Record<string, unknown>;
    return {
      request_id: typeof obj.request_id === "string" ? obj.request_id : undefined,
      trace_id: typeof obj.trace_id === "string" ? obj.trace_id : undefined,
      session_id: typeof obj.session_id === "string" ? obj.session_id : undefined,
      conversation_id:
        typeof obj.conversation_id === "string" ? obj.conversation_id : undefined,
      is_new_conversation:
        typeof obj.is_new_conversation === "boolean" ? obj.is_new_conversation : undefined,
      assistant_message_id:
        typeof obj.assistant_message_id === "string" ? obj.assistant_message_id : undefined,
      model: typeof obj.model === "string" && obj.model.trim() ? obj.model.trim() : undefined,
      route: typeof obj.route === "string" && obj.route.trim() ? obj.route.trim() : undefined,
    };
  } catch {
    return {};
  }
}

/** Extract rewritten query text from ``rewrite`` or ``done`` event JSON. */
export function rewriteTextFromGatewayData(dataRaw: string): string | null {
  try {
    const obj = JSON.parse(dataRaw) as Record<string, unknown>;
    const rewrite = obj.rewrite;
    if (typeof rewrite === "string" && rewrite.trim()) return rewrite.trim();
    const text = obj.text;
    if (typeof text === "string" && text.trim()) return text.trim();
    return null;
  } catch {
    return null;
  }
}

function parseRouteDetail(value: unknown): RouteDetail | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const detail: RouteDetail = {};
  if (typeof o.type === "string" && o.type.trim()) detail.type = o.type.trim();
  if (typeof o.name === "string" && o.name.trim()) detail.name = o.name.trim();
  if (typeof o.confidence === "number" && Number.isFinite(o.confidence)) {
    detail.confidence = o.confidence;
  }
  if (typeof o.reason === "string" && o.reason.trim()) detail.reason = o.reason.trim();
  return Object.keys(detail).length > 0 ? detail : null;
}

/** Parse gateway ``route`` SSE event JSON. */
export function routePayloadFromGatewayData(dataRaw: string): {
  route: string | null;
  route_detail: RouteDetail | null;
  route_source: string | null;
} {
  try {
    const obj = JSON.parse(dataRaw) as Record<string, unknown>;
    const route =
      typeof obj.route === "string" && obj.route.trim() ? obj.route.trim() : null;
    const route_detail = parseRouteDetail(obj.route_detail);
    const route_source =
      typeof obj.route_source === "string" && obj.route_source.trim()
        ? obj.route_source.trim()
        : null;
    return { route, route_detail, route_source };
  } catch {
    return { route: null, route_detail: null, route_source: null };
  }
}

/** Parse final answer metadata from gateway ``done`` event JSON. */
export function donePayloadFromGatewayData(dataRaw: string): {
  rewrite: string | null;
  citations: unknown[];
  follow_up_questions: string[];
  assistant_message_id: string | null;
  model: string | null;
  route: string | null;
  route_detail: RouteDetail | null;
  route_source: string | null;
  usage: Record<string, unknown> | null;
  latency_ms: Record<string, unknown> | null;
} {
  try {
    const obj = JSON.parse(dataRaw) as Record<string, unknown>;
    const citations = Array.isArray(obj.citations) ? obj.citations : [];
    const follow_up_questions = Array.isArray(obj.follow_up_questions)
      ? obj.follow_up_questions.filter((q): q is string => typeof q === "string")
      : [];
    const rewrite = rewriteTextFromGatewayData(dataRaw);
    const assistant_message_id =
      typeof obj.assistant_message_id === "string" && obj.assistant_message_id.trim()
        ? obj.assistant_message_id.trim()
        : null;
    const model =
      typeof obj.model === "string" && obj.model.trim() ? obj.model.trim() : null;
    const route =
      typeof obj.route === "string" && obj.route.trim() ? obj.route.trim() : null;
    const route_detail = parseRouteDetail(obj.route_detail);
    const route_source =
      typeof obj.route_source === "string" && obj.route_source.trim()
        ? obj.route_source.trim()
        : null;
    const usage =
      typeof obj.usage === "object" && obj.usage !== null && !Array.isArray(obj.usage)
        ? (obj.usage as Record<string, unknown>)
        : null;
    const latency_ms =
      typeof obj.latency_ms === "object" && obj.latency_ms !== null && !Array.isArray(obj.latency_ms)
        ? (obj.latency_ms as Record<string, unknown>)
        : null;
    return {
      rewrite,
      citations,
      follow_up_questions,
      assistant_message_id,
      model,
      route,
      route_detail,
      route_source,
      usage,
      latency_ms,
    };
  } catch {
    return {
      rewrite: null,
      citations: [],
      follow_up_questions: [],
      assistant_message_id: null,
      model: null,
      route: null,
      route_detail: null,
      route_source: null,
      usage: null,
      latency_ms: null,
    };
  }
}
