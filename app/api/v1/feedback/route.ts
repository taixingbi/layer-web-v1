/**
 * BFF feedback route: persists message feedback on the gateway (Supabase message_feedback).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { buildGatewayFeedbackBody, type FeedbackClientBody } from "@/lib/feedback";
import { gatewayResponseLogFields } from "@/lib/gateway-upstream-log";
import { resolveGatewayBearer } from "@/lib/gateway-auth";
import { gatewayPaths } from "@/lib/gateway-paths";
import { webApiPaths } from "@/lib/web-api-paths";
import { logWebEvent } from "@/lib/server-log";
import { msSince } from "@/lib/timing";
import {
  feedbackClientRequestForLog,
  feedbackGatewayRequestForLog,
  payloadForLog,
  webMeta,
} from "@/lib/web-log-payload";

export const runtime = "nodejs";

const VALID_RATINGS = new Set(["thumbs_up", "thumbs_down"] as const);
const THUMBS_DOWN_REASONS = new Set([
  "not_factually_correct",
  "didnt_follow_instructions",
  "offensive_unsafe",
  "wrong_language",
  "other",
]);

/**
 * Submit message feedback.
 * Body: ``{ message_id, conversation_id, feedback_type|rating, reason?, comment?, run_id?, ... }``.
 */
export async function POST(req: NextRequest) {
  const t0 = performance.now();
  const baseLog: Record<string, unknown> = {
    path: webApiPaths.feedback,
    method: "POST",
    backend: "gateway",
  };

  logWebEvent("request_received", "INFO", baseLog);

  const body = (await req.json()) as FeedbackClientBody & {
    feedback_type?: "thumbs_up" | "thumbs_down";
  };

  const rating =
    body.rating ??
    (body.feedback_type && VALID_RATINGS.has(body.feedback_type) ? body.feedback_type : undefined);

  const messageId = body.message_id?.trim() || "";
  const conversationId =
    body.conversation_id?.trim() || req.headers.get("x-conversation-id")?.trim() || "";
  const normalizedBody: FeedbackClientBody = {
    ...body,
    message_id: messageId,
    conversation_id: conversationId,
    rating,
  };

  if (!messageId || !conversationId) {
    logWebEvent("request_complete", "WARN", {
      ...baseLog,
      status: 400,
      latency_ms: msSince(t0),
      error: "missing_message_or_conversation",
    });
    return NextResponse.json(
      { error: "message_id and conversation_id are required" },
      { status: 400 },
    );
  }

  if (rating !== undefined && !VALID_RATINGS.has(rating)) {
    return NextResponse.json({ error: "rating must be thumbs_up or thumbs_down" }, { status: 400 });
  }
  if (rating === "thumbs_down" && body.reason !== undefined && !THUMBS_DOWN_REASONS.has(body.reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  const gatewayBody = buildGatewayFeedbackBody(normalizedBody);
  if (!gatewayBody) {
    return NextResponse.json({ error: "Invalid feedback payload" }, { status: 400 });
  }

  const token = resolveGatewayBearer(req, { allowGuestFallback: true });
  if (!token) {
    logWebEvent("request_complete", "WARN", {
      ...baseLog,
      status: 401,
      latency_ms: msSince(t0),
      error: "missing_gateway_token",
    });
    return NextResponse.json(
      {
        error:
          "Missing bearer for gateway. Sign in at /login so the session cookie is sent, or send Authorization: Bearer <access_token>.",
      },
      { status: 401 },
    );
  }

  logWebEvent("request_validated", "INFO", {
    ...baseLog,
    conversation_id: conversationId,
    ...webMeta({ web_api_request: feedbackClientRequestForLog(normalizedBody) }),
  });

  logWebEvent("gateway_api_request", "INFO", {
    ...baseLog,
    ...webMeta({ gateway_api_request: feedbackGatewayRequestForLog(gatewayBody) }),
  });

  try {
    const res = await fetch(`${config.gatewayBaseUrl}${gatewayPaths.feedback}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(conversationId ? { "X-Conversation-Id": conversationId } : {}),
      },
      body: JSON.stringify(gatewayBody),
      signal: AbortSignal.timeout(10_000),
    });
    logWebEvent("gateway_response", res.ok ? "INFO" : "WARN", {
      ...baseLog,
      ...gatewayResponseLogFields(res),
    });
    const responseText = await res.text();

    let gatewayResponseBody: unknown = null;
    if (responseText) {
      try {
        gatewayResponseBody = JSON.parse(responseText) as Record<string, unknown>;
      } catch {
        gatewayResponseBody = responseText;
      }
    }

    if (!res.ok) {
      logWebEvent("request_complete", "WARN", {
        ...baseLog,
        status: res.status,
        latency_ms: msSince(t0),
        error: responseText.slice(0, 500),
      });
      try {
        const parsed = JSON.parse(responseText || "{}") as {
          detail?: unknown;
          errors?: Array<{ msg?: string; loc?: unknown[] }>;
        };
        let errMsg = responseText || res.statusText;
        if (typeof parsed.detail === "string") {
          errMsg = parsed.detail;
        } else if (Array.isArray(parsed.errors) && parsed.errors[0]?.msg) {
          errMsg = parsed.errors[0].msg;
        }
        return NextResponse.json(
          { error: errMsg },
          { status: res.status === 401 ? 401 : res.status >= 500 ? 502 : res.status },
        );
      } catch {
        return NextResponse.json({ error: responseText || res.statusText }, { status: 502 });
      }
    }

    logWebEvent("request_complete", "INFO", {
      ...baseLog,
      status: res.status,
      latency_ms: msSince(t0),
      ...webMeta({
        web_api_response: payloadForLog(
          res.status === 204 ? { status: 204 } : gatewayResponseBody,
        ),
      }),
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
      latency_ms: msSince(t0),
      error: msg,
    });
    return NextResponse.json({ error: `Gateway: ${msg}` }, { status: 502 });
  }
}
