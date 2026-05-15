/**
 * One-line JSON logs aligned with layer-gateway-api-v1 ``EasternJsonFormatter`` field order
 * (``ts``, ``level``, ``message``, ``event``, ``service``, ``request_id``, …). Server-only.
 */

import { config } from "@/lib/config";

const LOG_FIELD_PRIORITY = [
  "ts",
  "level",
  "message",
  "event",
  "service",
  "request_id",
  "trace_id",
  "session_id",
  "path",
  "method",
  "status",
  "latency_ms",
  "ttfb_ms",
  "stream",
  "backend",
  "error",
] as const;

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

/** US Eastern wall clock + offset (seconds), matching gateway ``eastern_now_iso``. */
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
 * Emit a single JSON log line to stdout (same shape / key order as gateway ``log_event`` output).
 */
export function logWebEvent(
  event: string,
  level: WebLogLevel,
  fields: Record<string, unknown> = {}
): void {
  const { service: svcOverride, ...rest } = fields;
  const row: Record<string, unknown> = {
    ts: easternNowIsoSeconds(),
    level,
    message: event,
    event,
    service: typeof svcOverride === "string" && svcOverride ? svcOverride : config.webServiceName,
    ...rest,
  };
  process.stdout.write(`${JSON.stringify(orderLogFields(row))}\n`);
}
