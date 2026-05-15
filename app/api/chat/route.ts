import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import {
  donePayloadFromGatewayData,
  errorMessageFromGatewayData,
  metaFromGatewayData,
  parseSseBlock,
  tokenDeltaFromGatewayData,
} from "@/lib/gateway-chat";
import { gatewayResponseLogFields } from "@/lib/gateway-upstream-log";
import { logWebEvent } from "@/lib/server-log";

export const runtime = "nodejs";
export const maxDuration = 60;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
} as const;

function msSince(start: number): number {
  return Math.round((performance.now() - start) * 1000) / 1000;
}

function inboundCorrelation(req: NextRequest): {
  sessionId: string;
  requestId: string;
  traceId: string;
  log: Record<string, string>;
} {
  const sessionId = (req.headers.get("x-session-id") || "").trim();
  const requestId = (req.headers.get("x-request-id") || "").trim();
  const traceId = (req.headers.get("x-trace-id") || "").trim();
  const log: Record<string, string> = {};
  if (sessionId) log.session_id = sessionId;
  if (requestId) log.request_id = requestId;
  if (traceId) log.trace_id = traceId;
  return { sessionId, requestId, traceId, log };
}

function sendEvent(
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: unknown
) {
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

function resolveGatewayBearer(req: NextRequest): string {
  const envTok = config.gatewayBearerToken.trim();
  if (envTok) return envTok;
  const h = req.headers.get("authorization");
  if (h?.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return "";
}

async function pumpGatewayUpstreamToClientEvents(
  upstreamBody: ReadableStream<Uint8Array>,
  send: (event: string, data: unknown) => void
): Promise<void> {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  const meta: { request_id?: string; trace_id?: string; session_id?: string } = {};

  const handleBlock = (block: string) => {
    if (!block.trim()) return;
    const parsed = parseSseBlock(block);
    if (!parsed) return;
    const ev = parsed.event.toLowerCase();
    if (ev === "meta") {
      Object.assign(meta, metaFromGatewayData(parsed.dataRaw));
      send("status", "thinking");
    } else if (ev === "token") {
      const delta = tokenDeltaFromGatewayData(parsed.dataRaw);
      if (delta) {
        accumulated += delta;
        send("result_chunk", { delta });
      }
    } else if (ev === "error") {
      send("error", errorMessageFromGatewayData(parsed.dataRaw));
    } else if (ev === "done") {
      try {
        const j = JSON.parse(parsed.dataRaw) as { status?: string };
        if (j.status === "error") {
          return;
        }
      } catch {
        /* treat as success */
      }
      const done = donePayloadFromGatewayData(parsed.dataRaw);
      send("stream_end", {
        response: accumulated,
        run_id: meta.trace_id ?? "",
        request_id: meta.request_id ?? "",
        trace_id: meta.trace_id ?? "",
        session_id: meta.session_id ?? "",
        citations: done.citations,
        follow_up_questions: done.follow_up_questions,
      });
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      handleBlock(part);
    }
  }
  if (buffer.trim()) {
    handleBlock(buffer);
  }
}

export async function POST(req: NextRequest) {
  const t0 = performance.now();
  const { sessionId, requestId, traceId, log: corr } = inboundCorrelation(req);
  const baseLog: Record<string, unknown> = {
    path: "/api/chat",
    method: "POST",
    backend: "gateway",
    ...corr,
  };

  logWebEvent("request_received", "INFO", baseLog);

  const body = (await req.json()) as {
    message?: string;
    conversation_id?: string;
    history?: Array<{ role: string; content: string }>;
  };
  const { message, conversation_id: conversationId, history } = body;
  if (typeof conversationId === "string" && conversationId.trim()) {
    baseLog.conversation_id = conversationId.trim();
  }

  if (!message || typeof message !== "string") {
    logWebEvent("request_complete", "WARN", {
      ...baseLog,
      status: 400,
      stream: false,
      latency_ms: msSince(t0),
      error: "missing_message",
    });
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const token = resolveGatewayBearer(req);
  if (!token) {
    logWebEvent("request_complete", "WARN", {
      ...baseLog,
      status: 401,
      stream: false,
      latency_ms: msSince(t0),
      error: "missing_gateway_bearer",
    });
    return NextResponse.json(
      {
        status: "error",
        error: {
          code: "unauthorized",
          message: "Set GATEWAY_BEARER_TOKEN or send Authorization: Bearer to /api/chat",
        },
      },
      { status: 401 }
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (sessionId) headers["X-Session-Id"] = sessionId;
  if (conversationId && typeof conversationId === "string" && conversationId.trim()) {
    headers["X-Conversation-Id"] = conversationId.trim();
  }
  if (requestId) headers["X-Request-Id"] = requestId;
  if (traceId) headers["X-Trace-Id"] = traceId;

  logWebEvent("request_validated", "INFO", baseLog);

  let upstream: Response;
  try {
    upstream = await fetch(`${config.gatewayBaseUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message,
        stream: true,
        ...(typeof conversationId === "string" && conversationId.trim()
          ? { conversation_id: conversationId.trim() }
          : {}),
        ...(Array.isArray(history) && history.length > 0 ? { history } : {}),
        metadata: { page: "/chat", source: "nextjs-web", user_agent: "nextjs-bff" },
      }),
      signal: AbortSignal.timeout(65_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logWebEvent("request_complete", "ERROR", {
      ...baseLog,
      status: 502,
      stream: false,
      latency_ms: msSince(t0),
      error: msg,
    });
    return NextResponse.json({ error: { code: "gateway_unreachable", message: msg } }, { status: 502 });
  }

  logWebEvent("gateway_response", upstream.ok ? "INFO" : "WARN", {
    ...baseLog,
    ...gatewayResponseLogFields(upstream),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    logWebEvent("request_complete", "WARN", {
      ...baseLog,
      status: upstream.status,
      stream: false,
      latency_ms: msSince(t0),
      error: text.slice(0, 500),
    });
    try {
      const j = JSON.parse(text) as Record<string, unknown>;
      return NextResponse.json(j, { status: upstream.status });
    } catch {
      return NextResponse.json(
        { status: "error", error: { code: "gateway_error", message: text || upstream.statusText } },
        { status: upstream.status }
      );
    }
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = (await upstream.json()) as Record<string, unknown>;
    const answer = typeof json.answer === "string" ? json.answer : "";
    logWebEvent("request_complete", "INFO", {
      ...baseLog,
      status: 200,
      stream: false,
      latency_ms: msSince(t0),
    });
    return NextResponse.json({
      response: answer,
      session_id: json.session_id,
      request_id: json.request_id,
      trace_id: json.trace_id,
      citations: json.citations,
      follow_up_questions: json.follow_up_questions,
    });
  }

  if (!upstream.body) {
    logWebEvent("request_complete", "ERROR", {
      ...baseLog,
      status: 502,
      stream: true,
      latency_ms: msSince(t0),
      error: "no_upstream_body",
    });
    return NextResponse.json({ error: { code: "gateway_error", message: "No response body" } }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => sendEvent(encoder, controller, event, data);
      const tPump = performance.now();
      let terminalStatus = 200;
      let level: "INFO" | "ERROR" = "INFO";
      try {
        send("status", "thinking");
        await pumpGatewayUpstreamToClientEvents(upstream.body!, send);
      } catch (err) {
        terminalStatus = 502;
        level = "ERROR";
        send("error", err instanceof Error ? err.message : String(err));
      } finally {
        logWebEvent("request_complete", level, {
          ...baseLog,
          status: terminalStatus,
          stream: true,
          latency_ms: msSince(tPump),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
