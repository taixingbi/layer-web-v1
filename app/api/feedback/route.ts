import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { gatewayResponseLogFields } from "@/lib/gateway-upstream-log";
import { logWebEvent } from "@/lib/server-log";

export const runtime = "nodejs";

const VALID_FEEDBACK_TYPES = new Set(["thumbs_up", "thumbs_down"] as const);
const THUMBS_DOWN_REASONS = new Set([
  "not_factually_correct",
  "didnt_follow_instructions",
  "offensive_unsafe",
  "wrong_language",
  "other",
]);
/** Maps UI reasons to gateway `feedback_type` strings (see gateway FeedbackRequest). */
const REASON_TO_FEEDBACK_TYPE: Record<string, string> = {
  not_factually_correct: "not_factual",
  didnt_follow_instructions: "incomplete_instructions",
  offensive_unsafe: "unsafe",
  wrong_language: "not_relevant",
  other: "other",
};

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

function resolveGatewayBearer(req: NextRequest): string {
  const envTok = config.gatewayBearerToken.trim();
  if (envTok) return envTok;
  const h = req.headers.get("authorization");
  if (h?.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return "";
}

export async function POST(req: NextRequest) {
  const t0 = performance.now();
  const { log: corr } = inboundCorrelation(req);
  const baseLog: Record<string, unknown> = {
    path: "/api/feedback",
    method: "POST",
    backend: "gateway",
    ...corr,
  };

  logWebEvent("request_received", "INFO", baseLog);

  const body = (await req.json()) as {
    run_id?: string;
    request_id?: string;
    feedback_type?: "thumbs_up" | "thumbs_down";
    reason?: string;
    question?: string;
    comment?: string;
  };
  if (!body.run_id) {
    logWebEvent("request_complete", "WARN", {
      ...baseLog,
      status: 400,
      stream: false,
      latency_ms: msSince(t0),
      error: "missing_run_id",
    });
    return NextResponse.json({ error: "Missing run_id" }, { status: 400 });
  }
  if (body.feedback_type !== undefined && !VALID_FEEDBACK_TYPES.has(body.feedback_type)) {
    logWebEvent("request_complete", "WARN", {
      ...baseLog,
      status: 400,
      stream: false,
      latency_ms: msSince(t0),
      error: "invalid_feedback_type",
    });
    return NextResponse.json({ error: "feedback_type must be thumbs_up or thumbs_down" }, { status: 400 });
  }
  if (body.feedback_type === "thumbs_down" && body.reason !== undefined && !THUMBS_DOWN_REASONS.has(body.reason)) {
    logWebEvent("request_complete", "WARN", {
      ...baseLog,
      status: 400,
      stream: false,
      latency_ms: msSince(t0),
      error: "invalid_reason",
    });
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  const rating = body.feedback_type === "thumbs_up" ? "thumbs_up" : "thumbs_down";

  const token = resolveGatewayBearer(req);
  if (!token) {
    logWebEvent("request_complete", "WARN", {
      ...baseLog,
      status: 401,
      stream: false,
      latency_ms: msSince(t0),
      error: "missing_gateway_token",
    });
    return NextResponse.json({ error: "Missing gateway token" }, { status: 401 });
  }

  const gatewayBody: Record<string, unknown> = {
    trace_id: body.run_id,
    rating,
  };
  if (body.request_id) gatewayBody.request_id = body.request_id;
  if (body.feedback_type === "thumbs_down" && body.reason) {
    gatewayBody.feedback_type = REASON_TO_FEEDBACK_TYPE[body.reason] ?? body.reason;
  }
  if (body.comment) gatewayBody.comment = body.comment;
  if (body.question) gatewayBody.question = body.question;

  logWebEvent("request_validated", "INFO", baseLog);

  try {
    const res = await fetch(`${config.gatewayBaseUrl}/api/feedback`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gatewayBody),
      signal: AbortSignal.timeout(10_000),
    });
    logWebEvent("gateway_response", res.ok ? "INFO" : "WARN", {
      ...baseLog,
      ...gatewayResponseLogFields(res),
    });
    const responseText = await res.text();

    if (!res.ok) {
      logWebEvent("request_complete", "WARN", {
        ...baseLog,
        status: res.status,
        stream: false,
        latency_ms: msSince(t0),
        error: responseText.slice(0, 500),
      });
      try {
        const parsed = JSON.parse(responseText || "{}") as { detail?: unknown };
        return NextResponse.json(
          { error: typeof parsed.detail === "string" ? parsed.detail : responseText || res.statusText },
          { status: res.status === 401 ? 401 : 502 }
        );
      } catch {
        return NextResponse.json({ error: responseText || res.statusText }, { status: 502 });
      }
    }
    logWebEvent("request_complete", "INFO", {
      ...baseLog,
      status: res.status,
      stream: false,
      latency_ms: msSince(t0),
    });
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    try {
      return NextResponse.json(JSON.parse(responseText || "{}"));
    } catch {
      return NextResponse.json({ success: true });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logWebEvent("request_complete", "ERROR", {
      ...baseLog,
      status: 502,
      stream: false,
      latency_ms: msSince(t0),
      error: msg,
    });
    return NextResponse.json({ error: `Gateway: ${msg}` }, { status: 502 });
  }
}
