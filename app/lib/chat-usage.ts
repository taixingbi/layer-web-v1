import type { TokenUsageSlice } from "@/lib/chat-types";

export function asUsageSlice(value: unknown): TokenUsageSlice | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const prompt =
    typeof o.prompt_tokens === "number" ? o.prompt_tokens : undefined;
  const completion =
    typeof o.completion_tokens === "number" ? o.completion_tokens : undefined;
  const total = typeof o.total_tokens === "number" ? o.total_tokens : undefined;
  if (prompt == null && completion == null && total == null) return null;
  return { prompt_tokens: prompt, completion_tokens: completion, total_tokens: total };
}

export type UsageRow = {
  key: string;
  label: string;
  usage: TokenUsageSlice;
};

const USAGE_LABELS: Record<string, string> = {
  intent_router: "Router",
  tool_rag: "RAG (total)",
  tool_github_search: "GitHub Search",
  tool_tavily_search: "Tavily Search",
  total: "Total",
};

function nestedUsageRows(prefix: string, label: string, obj: Record<string, unknown>): UsageRow[] {
  const rows: UsageRow[] = [];
  const direct = asUsageSlice(obj);
  if (direct) {
    rows.push({ key: prefix, label, usage: direct });
    return rows;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === "total" && asUsageSlice(v)) {
      rows.push({
        key: `${prefix}.total`,
        label: `${label} · total`,
        usage: asUsageSlice(v)!,
      });
      continue;
    }
    const slice = asUsageSlice(v);
    if (slice) {
      const sub =
        k === "chat"
          ? "Chat"
          : k === "follow_up_chat"
            ? "Suggested questions"
            : k.replace(/_/g, " ");
      rows.push({
        key: `${prefix}.${k}`,
        label: `${label} · ${sub}`,
        usage: slice,
      });
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      rows.push(
        ...nestedUsageRows(
          `${prefix}.${k}`,
          `${label} · ${k.replace(/_/g, " ")}`,
          v as Record<string, unknown>,
        ),
      );
    }
  }
  return rows;
}

/** Read token usage for one tool phase (e.g. ``tool_rag`` · ``chat``). */
export function phaseUsageSlice(
  usage: Record<string, unknown> | undefined,
  toolKey: string,
  phaseKey: string,
): TokenUsageSlice | null {
  if (!usage) return null;
  const tool = usage[toolKey];
  if (!tool || typeof tool !== "object" || Array.isArray(tool)) return null;
  return asUsageSlice((tool as Record<string, unknown>)[phaseKey]);
}

/** Flatten gateway ``usage`` object for the debug panel. */
export function parseUsageRows(usage: Record<string, unknown> | undefined): UsageRow[] {
  if (!usage) return [];
  const rows: UsageRow[] = [];
  for (const [key, value] of Object.entries(usage)) {
    const label = USAGE_LABELS[key] ?? key.replace(/_/g, " ");
    if (value && typeof value === "object" && !Array.isArray(value)) {
      rows.push(...nestedUsageRows(key, label, value as Record<string, unknown>));
    }
  }
  return rows;
}

export function formatTokenLine(usage: TokenUsageSlice): string {
  const parts: string[] = [];
  if (usage.prompt_tokens != null) parts.push(`${usage.prompt_tokens} prompt`);
  if (usage.completion_tokens != null) parts.push(`${usage.completion_tokens} output`);
  if (usage.total_tokens != null && parts.length === 0) {
    parts.push(`${usage.total_tokens} total`);
  }
  return parts.join(" · ");
}

/** Total token count for one usage slice. */
export function tokenCount(usage: TokenUsageSlice | null | undefined): number {
  if (!usage) return 0;
  if (usage.total_tokens != null && Number.isFinite(usage.total_tokens)) {
    return Math.round(usage.total_tokens);
  }
  const prompt = usage.prompt_tokens ?? 0;
  const completion = usage.completion_tokens ?? 0;
  return Math.round(prompt + completion);
}

const USD_PER_M_INPUT = 0.15;
const USD_PER_M_OUTPUT = 0.6;
const USD_PER_M_TOTAL_FALLBACK = 0.35;

/** Rough USD estimate from token counts (self-hosted / blended rate). */
export function estimateUsageCostUsd(usage: TokenUsageSlice | null | undefined): number {
  if (!usage) return 0;
  const prompt = usage.prompt_tokens ?? 0;
  const completion = usage.completion_tokens ?? 0;
  if (prompt > 0 || completion > 0) {
    return (prompt * USD_PER_M_INPUT + completion * USD_PER_M_OUTPUT) / 1_000_000;
  }
  const total = usage.total_tokens ?? 0;
  return (total * USD_PER_M_TOTAL_FALLBACK) / 1_000_000;
}

export function formatUsageCost(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

export function formatUsageTokens(tokens: number): string {
  return `${Math.round(tokens)} tok`;
}

/** True when usage envelope has at least one token. */
export function hasUsageTokens(usage: Record<string, unknown> | undefined): boolean {
  if (!usage) return false;
  const top = asUsageSlice(usage);
  if (top && tokenCount(top) > 0) return true;
  return parseUsageRows(usage).some((row) => tokenCount(row.usage) > 0);
}
