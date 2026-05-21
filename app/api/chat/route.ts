/**
 * BFF chat route: proxies streaming SSE (or JSON) to layer-gateway-api-v1 with structured logs.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { mergeGatewayLatencyWithBff } from "@/lib/chat-latency";
import { msSince } from "@/lib/timing";
import {
  donePayloadFromGatewayData,
  errorMessageFromGatewayData,
  metaFromGatewayData,
  parseSseBlock,
  rewriteTextFromGatewayData,
  tokenDeltaFromGatewayData,
  type GatewayMeta,
} from "@/lib/gateway-chat";
import { gatewayResponseLogFields } from "@/lib/gateway-upstream-log";
import { resolveGatewayBearer } from "@/lib/gateway-auth";
import { logWebEvent } from "@/lib/server-log";
import {
  chatClientRequestForLog,
  chatClientResponseForLog,
  chatGatewayJsonResponseForLog,
  chatGatewayRequestForLog,
  payloadForLog,
  webMeta,
} from "@/lib/web-log-payload";

/** Node.js runtime (streaming fetch, structured logging). */
export const runtime = "nodejs";
/** Vercel/serverless max duration for long upstream streams (seconds). */
export const maxDuration = 60;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
} as const;

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

type StreamPumpResult = {
  rewrite: string | null;
  response: string;
  citations: unknown[];
  follow_up_questions: string[];
};

type BffStreamTiming = {
  routeT0: number;
  pumpT0: number;
};

async function pumpGatewayUpstreamToClientEvents(
  upstreamBody: ReadableStream<Uint8Array>,
  send: (event: string, data: unknown) => void,
  logFields?: Record<string, unknown>,
  bffTiming?: BffStreamTiming,
): Promise<StreamPumpResult> {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let rewrite: string | null = null;
  let lastCitations: unknown[] = [];
  let lastFollowUps: string[] = [];
  const meta: GatewayMeta = {};

  const handleBlock = (block: string) => {
    if (!block.trim()) return;
    const parsed = parseSseBlock(block);
    if (!parsed) return;
    const ev = parsed.event.toLowerCase();
    if (ev === "meta") {
      const chunkMeta = metaFromGatewayData(parsed.dataRaw);
      Object.assign(meta, chunkMeta);
      if (chunkMeta.assistant_message_id) {
        send("assistant_message_id", {
          assistant_message_id: chunkMeta.assistant_message_id,
          ...(chunkMeta.conversation_id ? { conversation_id: chunkMeta.conversation_id } : {}),
        });
      }
      if (chunkMeta.conversation_id && !chunkMeta.assistant_message_id) {
        send("conversation_id", { conversation_id: chunkMeta.conversation_id });
      }
      if (!chunkMeta.assistant_message_id) {
        send("status", "thinking");
      }
    } else if (ev === "rewrite") {
      const text = rewriteTextFromGatewayData(parsed.dataRaw);
      if (text) {
        rewrite = text;
        send("rewrite", { text });
      }
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
      const effectiveRewrite = rewrite ?? done.rewrite;
      lastCitations = done.citations;
      lastFollowUps = done.follow_up_questions;
      if (done.assistant_message_id) {
        meta.assistant_message_id = done.assistant_message_id;
      }
      if (done.model) {
        meta.model = done.model;
      }
      if (done.route) {
        meta.route = done.route;
      }
      if (logFields) {
        logWebEvent("stream_end", "INFO", {
          ...logFields,
          stream: true,
          ...(meta.request_id ? { gateway_request_id: meta.request_id } : {}),
          ...(meta.trace_id ? { gateway_trace_id: meta.trace_id } : {}),
          ...(meta.session_id ? { session_id: meta.session_id } : {}),
          note: `citations=${done.citations.length} follow_ups=${done.follow_up_questions.length} rewrite=${effectiveRewrite ? "yes" : "no"}`,
          ...webMeta({
            gateway_api_response: {
              done: payloadForLog(
                (() => {
                  try {
                    return JSON.parse(parsed.dataRaw) as Record<string, unknown>;
                  } catch {
                    return { raw: parsed.dataRaw };
                  }
                })()
              ),
            },
            web_api_response: chatClientResponseForLog({
              stream: true,
              response: accumulated,
              rewrite: effectiveRewrite,
              citations: done.citations,
              follow_up_questions: done.follow_up_questions,
              request_id: meta.request_id,
              trace_id: meta.trace_id,
              session_id: meta.session_id,
            }),
          }),
        });
      }
      if (done.citations.length > 0) {
        send("citations", { citations: done.citations });
      }
      if (done.follow_up_questions.length > 0) {
        send("follow_up_questions", { follow_up_questions: done.follow_up_questions });
      }
      const latency_ms = bffTiming
        ? mergeGatewayLatencyWithBff(done.latency_ms, {
            routeMs: msSince(bffTiming.routeT0),
            upstreamPumpMs: msSince(bffTiming.pumpT0),
          })
        : undefined;
      if (latency_ms) {
        send("latency_ms", { latency_ms });
      }
      send("stream_end", {
        ...(effectiveRewrite ? { rewrite: effectiveRewrite } : {}),
        run_id: meta.trace_id ?? "",
        request_id: meta.request_id ?? "",
        trace_id: meta.trace_id ?? "",
        session_id: meta.session_id ?? "",
        ...(meta.conversation_id ? { conversation_id: meta.conversation_id } : {}),
        ...(meta.assistant_message_id
          ? { assistant_message_id: meta.assistant_message_id }
          : {}),
        ...(meta.model ? { model: meta.model } : {}),
        ...(meta.route ? { route: meta.route } : {}),
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

  const effectiveRewrite = rewrite;
  return {
    rewrite: effectiveRewrite,
    response: accumulated,
    citations: lastCitations,
    follow_up_questions: lastFollowUps,
  };
}

/**
 * Stream or buffer chat from gateway; requires session cookie or ``Authorization`` bearer.
 * Body: ``{ message, conversation_id?, history? }``.
 */
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
      ...webMeta({
        web_api_request: chatClientRequestForLog(body),
        web_api_response: { status: "error", error: "missing_message" },
      }),
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
          message:
            "Missing bearer for gateway. Sign in at /login so the session cookie is sent, or send Authorization: Bearer <access_token>.",
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

  const gatewayRequestBody: Record<string, unknown> = {
    message,
    stream: true,
    ...(typeof conversationId === "string" && conversationId.trim()
      ? { conversation_id: conversationId.trim() }
      : {}),
    ...(Array.isArray(history) && history.length > 0 ? { history } : {}),
    metadata: { page: "/chat", source: "nextjs-web", user_agent: "nextjs-bff" },
  };

  logWebEvent("request_validated", "INFO", {
    ...baseLog,
    ...webMeta({
      web_api_request: chatClientRequestForLog(body),
    }),
  });

  logWebEvent("gateway_api_request", "INFO", {
    ...baseLog,
    stream: true,
    ...webMeta({
      gateway_api_request: chatGatewayRequestForLog(gatewayRequestBody),
    }),
  });

  let upstream: Response;
  try {
    upstream = await fetch(`${config.gatewayBaseUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(gatewayRequestBody),
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

  const contentType = upstream.headers.get("content-type") || "";

  logWebEvent("gateway_response", upstream.ok ? "INFO" : "WARN", {
    ...baseLog,
    ...gatewayResponseLogFields(upstream),
    ...(upstream.ok && contentType.includes("text/event-stream")
      ? webMeta({ gateway_api_response: { streaming: true } })
      : {}),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    let gatewayErrorBody: unknown = text;
    try {
      gatewayErrorBody = JSON.parse(text) as Record<string, unknown>;
    } catch {
      /* keep text */
    }
    logWebEvent("gateway_api_response", "WARN", {
      ...baseLog,
      status: upstream.status,
      stream: false,
      ...webMeta({
        gateway_api_response: gatewayErrorBody,
      }),
    });
    logWebEvent("request_complete", "WARN", {
      ...baseLog,
      status: upstream.status,
      stream: false,
      latency_ms: msSince(t0),
      error: text.slice(0, 500),
      ...webMeta({
        web_api_response: { status: "error", body: gatewayErrorBody },
      }),
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

  if (contentType.includes("application/json")) {
    const json = (await upstream.json()) as Record<string, unknown>;
    const answer = typeof json.answer === "string" ? json.answer : "";
    const latency_ms = mergeGatewayLatencyWithBff(json.latency_ms, { routeMs: msSince(t0) });
    const clientResponse = {
      response: answer,
      session_id: json.session_id,
      request_id: json.request_id,
      trace_id: json.trace_id,
      ...(typeof json.conversation_id === "string" && json.conversation_id.trim()
        ? { conversation_id: json.conversation_id.trim() }
        : {}),
      ...(typeof json.assistant_message_id === "string" && json.assistant_message_id.trim()
        ? { assistant_message_id: json.assistant_message_id.trim() }
        : {}),
      rewrite: typeof json.rewrite === "string" ? json.rewrite : null,
      citations: json.citations,
      follow_up_questions: json.follow_up_questions,
      ...(latency_ms ? { latency_ms } : {}),
    };
    logWebEvent("gateway_api_response", "INFO", {
      ...baseLog,
      status: 200,
      stream: false,
      ...webMeta({
        gateway_api_response: chatGatewayJsonResponseForLog(json),
      }),
    });
    logWebEvent("request_complete", "INFO", {
      ...baseLog,
      status: 200,
      stream: false,
      latency_ms: msSince(t0),
      ...webMeta({
        web_api_response: chatClientResponseForLog({
          stream: false,
          response: answer,
          rewrite: typeof json.rewrite === "string" ? json.rewrite : null,
          citations: Array.isArray(json.citations) ? json.citations : [],
          follow_up_questions: Array.isArray(json.follow_up_questions)
            ? (json.follow_up_questions as string[])
            : [],
          request_id: typeof json.request_id === "string" ? json.request_id : undefined,
          trace_id: typeof json.trace_id === "string" ? json.trace_id : undefined,
          session_id: typeof json.session_id === "string" ? json.session_id : undefined,
        }),
      }),
    });
    return NextResponse.json(clientResponse);
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
        await pumpGatewayUpstreamToClientEvents(upstream.body!, send, baseLog, {
          routeT0: t0,
          pumpT0: tPump,
        });
      } catch (err) {
        terminalStatus = 502;
        level = "ERROR";
        const errMsg = err instanceof Error ? err.message : String(err);
        send("error", errMsg);
        logWebEvent("web_api_response", "ERROR", {
          ...baseLog,
          stream: true,
          status: 502,
          ...webMeta({
            web_api_response: { status: "error", message: errMsg },
          }),
        });
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
