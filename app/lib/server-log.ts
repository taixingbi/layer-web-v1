/**
 * One-line JSON logs — same leading field order and semantics as layer-gateway-api-v1
 * ``app/core/logging.py`` (``ts``, ``level``, ``logger``, ``phase``, ``event``, ``message``, …).
 * Server-only; do not import from client components.
 */

import { config } from "@/lib/config";

/** Logger name in every JSON line (gateway uses ``gateway``). */
export const WEB_LOGGER = "layer-web";

/** Shared prefix with gateway ``LOG_FIELD_PRIORITY``; BFF-specific keys follow. */
export const LOG_FIELD_PRIORITY = [
  "ts",
  "level",
  "logger",
  "phase",
  "event",
  "message",
  "service",
  "request_id",
  "trace_id",
  "session_id",
  "conversation_id",
  "path",
  "method",
  "status",
  "web_meta",
  "latency_ms",
  "ttfb_ms",
  "stream",
  "backend",
  "gateway_status",
  "gateway_content_type",
  "gateway_content_length",
  "gateway_request_id",
  "gateway_trace_id",
  "error",
  "note",
] as const;

const EVENT_PHASE: Record<string, string> = {
  request_received: "ingress",
  request_validated: "ingress",
  request_complete: "access",
  gateway_response: "upstream",
  stream_end: "upstream",
  web_api_request: "ingress",
  web_api_response: "access",
  gateway_api_request: "upstream",
  gateway_api_response: "upstream",
  password_reset_link_opened: "auth",
  password_reset_requested: "auth",
};

const EVENT_MESSAGE: Record<string, string> = {
  request_received: "Request received",
  request_validated: "Request validated",
  request_complete: "Request complete",
  gateway_response: "Gateway response",
  stream_end: "Stream complete",
  web_api_request: "web_api_request",
  web_api_response: "web_api_response",
  gateway_api_request: "gateway_api_request",
  gateway_api_response: "gateway_api_response",
  password_reset_link_opened: "Password reset link opened",
  password_reset_requested: "Password reset requested",
};

export function phaseForEvent(event: string): string {
  return EVENT_PHASE[event] ?? "system";
}

export function messageForEvent(event: string): string {
  return EVENT_MESSAGE[event] ?? event;
}

function easternWallIso(d: Date): string {
  return d
    .toLocaleString("sv-SE", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(" ", "T");
}

function easternTimeZoneOffsetIso(d: Date): string {
  const raw = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")?.value;
  if (!raw?.startsWith("GMT")) return "Z";
  const inner = raw.slice(3).trim();
  const m = inner.match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return "Z";
  const hh = m[2].padStart(2, "0");
  const mm = (m[3] ?? "00").padStart(2, "0");
  return `${m[1]}${hh}:${mm}`;
}

/** US Eastern wall clock + offset (gateway ``eastern_from_timestamp``, second precision). */
export function easternNowIsoSeconds(date = new Date()): string {
  return `${easternWallIso(date)}${easternTimeZoneOffsetIso(date)}`;
}

function orderLogFields(row: Record<string, unknown>): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (const key of LOG_FIELD_PRIORITY) {
    if (key in row && row[key] !== undefined) {
      ordered[key] = row[key];
      seen.add(key);
    }
  }
  const rest = Object.keys(row)
    .filter((k) => !seen.has(k))
    .sort();
  for (const k of rest) {
    const v = row[k];
    if (v !== undefined) ordered[k] = v;
  }
  return ordered;
}

export type WebLogLevel = "INFO" | "WARN" | "ERROR";

/**
 * Emit one structured JSON log line (gateway-compatible shape).
 *
 * @param event Machine event name (``request_received``, ``gateway_response``, …)
 * @param level ``INFO`` | ``WARN`` | ``ERROR``
 * @param fields Correlation and context; optional ``phase``, ``message``, ``logger``, ``service`` overrides
 */
export function logWebEvent(
  event: string,
  level: WebLogLevel,
  fields: Record<string, unknown> = {}
): void {
  const {
    service: svcOverride,
    phase: phaseOverride,
    message: messageOverride,
    logger: loggerOverride,
    ...rest
  } = fields;
  const row: Record<string, unknown> = {
    ts: easternNowIsoSeconds(),
    level,
    logger: typeof loggerOverride === "string" && loggerOverride ? loggerOverride : WEB_LOGGER,
    phase: typeof phaseOverride === "string" && phaseOverride ? phaseOverride : phaseForEvent(event),
    event,
    message:
      typeof messageOverride === "string" && messageOverride
        ? messageOverride
        : messageForEvent(event),
    service: typeof svcOverride === "string" && svcOverride ? svcOverride : config.webServiceName,
    ...rest,
  };
  process.stdout.write(`${JSON.stringify(orderLogFields(row))}\n`);
}
