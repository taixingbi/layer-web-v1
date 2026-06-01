import type { TokenUsageSlice } from "@/lib/chat-types";

function asUsageSlice(value: unknown): TokenUsageSlice | null {
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
            ? "Follow-up Chat"
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
