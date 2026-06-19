/** Format gateway ``latency_ms`` JSON for admin guest history table cells. */

import { isLatencyObject, latencyDisplayTotalMs } from "@/lib/chat-latency";

export function formatGuestHistoryLatency(
  latency: Record<string, unknown> | null | undefined,
): string {
  if (!isLatencyObject(latency)) return "—";
  const ms = latencyDisplayTotalMs(latency);
  if (ms != null) return `${ms}ms`;
  const legacy = latency.total_ms;
  if (typeof legacy === "number" && Number.isFinite(legacy)) return `${Math.round(legacy)}ms`;
  return "—";
}
