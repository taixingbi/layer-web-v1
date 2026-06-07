/**
 * Format usage values for the shared execution timeline.
 */

import { formatUsageCost, formatUsageTokens } from "@/lib/chat-usage";

/** Pad label + dots so token/cost columns align (monospace). Omits metrics when ``tokens`` is 0. */
export function formatUsageLine(
  label: string,
  tokens: number,
  costUsd: number,
  opts?: { prefix?: string; connector?: string; labelWidth?: number; rank?: number },
): string {
  const prefix = opts?.prefix ?? "";
  const connector = opts?.connector ?? "└─ ";
  const rankTag = opts?.rank != null ? ` [#${opts.rank}]` : "";
  if (tokens <= 0) {
    return `${prefix}${connector}${label}${rankTag}`;
  }
  const labelWidth = opts?.labelWidth ?? 22;
  const labelPart = label.padEnd(labelWidth, " ");
  const valuePart = `${formatUsageTokens(tokens)}   ${formatUsageCost(costUsd)}${rankTag}`;
  const used = prefix.length + connector.length + labelPart.length + 1;
  const dots = Math.max(6, 52 - used - valuePart.length);
  return `${prefix}${connector}${labelPart} ${".".repeat(dots)} ${valuePart}`;
}
