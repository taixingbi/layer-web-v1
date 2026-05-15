/** Truncate and shape bodies for structured BFF logs (aligned with gateway ``_payload_for_log``). */

const LOG_BODY_MAX_CHARS = 8000;

export function payloadForLog(payload: unknown): unknown {
  if (payload === null || payload === undefined) {
    return payload;
  }
  try {
    const text = JSON.stringify(payload);
    if (text.length <= LOG_BODY_MAX_CHARS) {
      return payload;
    }
    return { _truncated: true, preview: text.slice(0, LOG_BODY_MAX_CHARS) };
  } catch {
    const text = String(payload);
    if (text.length <= LOG_BODY_MAX_CHARS) {
      return text;
    }
    return { _truncated: true, preview: text.slice(0, LOG_BODY_MAX_CHARS) };
  }
}

/** Nest request/response payloads under ``web_meta`` (gateway-style ``gateway_meta``). */
export function webMeta(parts: Record<string, unknown>): { web_meta?: Record<string, unknown> } {
  const meta: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parts)) {
    if (value !== undefined) {
      meta[key] = payloadForLog(value);
    }
  }
  return Object.keys(meta).length > 0 ? { web_meta: meta } : {};
}

export function chatClientRequestForLog(body: {
  message?: string;
  conversation_id?: string;
  history?: Array<{ role: string; content: string }>;
}): Record<string, unknown> {
  const history = Array.isArray(body.history) ? body.history : [];
  return {
    message: body.message,
    conversation_id: body.conversation_id,
    history_turns: history.length,
    ...(history.length > 0 ? { history } : {}),
  };
}

export function chatGatewayRequestForLog(body: Record<string, unknown>): Record<string, unknown> {
  return { ...body };
}

export function chatGatewayJsonResponseForLog(json: Record<string, unknown>): Record<string, unknown> {
  return {
    status: "success",
    session_id: json.session_id,
    request_id: json.request_id,
    trace_id: json.trace_id,
    answer: json.answer,
    rewrite: json.rewrite,
    citations: json.citations,
    follow_up_questions: json.follow_up_questions,
    usage: json.usage,
  };
}

export function chatClientResponseForLog(parts: {
  response?: string;
  rewrite?: string | null;
  citations?: unknown[];
  follow_up_questions?: string[];
  request_id?: string;
  trace_id?: string;
  session_id?: string;
  stream?: boolean;
}): Record<string, unknown> {
  const response = parts.response ?? "";
  return {
    stream: parts.stream ?? false,
    response_chars: response.length,
    ...(response ? { response } : {}),
    ...(parts.rewrite ? { rewrite: parts.rewrite } : {}),
    citations_count: parts.citations?.length ?? 0,
    follow_up_questions_count: parts.follow_up_questions?.length ?? 0,
    ...(parts.request_id ? { request_id: parts.request_id } : {}),
    ...(parts.trace_id ? { trace_id: parts.trace_id } : {}),
    ...(parts.session_id ? { session_id: parts.session_id } : {}),
  };
}

export function feedbackClientRequestForLog(body: Record<string, unknown>): Record<string, unknown> {
  return {
    run_id: body.run_id,
    request_id: body.request_id,
    feedback_type: body.feedback_type,
    reason: body.reason,
    question: body.question,
    comment: body.comment,
  };
}

export function feedbackGatewayRequestForLog(body: Record<string, unknown>): Record<string, unknown> {
  return { ...body };
}
