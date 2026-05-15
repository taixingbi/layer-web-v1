/**
 * Translate layer-gateway-api-v1 SSE (`meta`, `token`, `error`, `done`) into the
 * shapes expected by `app/chat/page.tsx` (`status`, `result_chunk`, `error`, `stream_end`).
 */

export type GatewayMeta = {
  request_id?: string;
  trace_id?: string;
  session_id?: string;
};

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

export function metaFromGatewayData(dataRaw: string): GatewayMeta {
  try {
    const obj = JSON.parse(dataRaw) as Record<string, unknown>;
    return {
      request_id: typeof obj.request_id === "string" ? obj.request_id : undefined,
      trace_id: typeof obj.trace_id === "string" ? obj.trace_id : undefined,
      session_id: typeof obj.session_id === "string" ? obj.session_id : undefined,
    };
  } catch {
    return {};
  }
}

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

export function donePayloadFromGatewayData(dataRaw: string): {
  rewrite: string | null;
  citations: unknown[];
  follow_up_questions: string[];
} {
  try {
    const obj = JSON.parse(dataRaw) as Record<string, unknown>;
    const citations = Array.isArray(obj.citations) ? obj.citations : [];
    const follow_up_questions = Array.isArray(obj.follow_up_questions)
      ? obj.follow_up_questions.filter((q): q is string => typeof q === "string")
      : [];
    const rewrite = rewriteTextFromGatewayData(dataRaw);
    return { rewrite, citations, follow_up_questions };
  } catch {
    return { rewrite: null, citations: [], follow_up_questions: [] };
  }
}
