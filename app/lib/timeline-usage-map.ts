/**
 * Map latency timeline node ids to token usage slices from the gateway envelope.
 */

import {
  asUsageSlice,
  estimateUsageCostUsd,
  phaseUsageSlice,
  tokenCount,
} from "@/lib/chat-usage";
import type { TokenUsageSlice } from "@/lib/chat-types";
import type { LatencyTimelineNode } from "@/lib/latency-timeline";

export type NodeUsageMetrics = {
  tokens: number;
  costUsd: number;
  percent: number;
};

function readToolBlock(usage: Record<string, unknown>, ...keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const raw = usage[key];
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
  }
  return null;
}

function metricsFromSlice(slice: TokenUsageSlice | null, rootTokens: number): NodeUsageMetrics {
  const tokens = slice ? tokenCount(slice) : 0;
  return {
    tokens,
    costUsd: slice ? estimateUsageCostUsd(slice) : 0,
    percent: rootTokens > 0 ? Math.round((tokens / rootTokens) * 100) : 0,
  };
}

/** Direct usage slice for one latency tree node (null → zero tokens). */
export function usageSliceForTimelineNode(
  nodeId: string,
  label: string,
  usage: Record<string, unknown> | undefined,
): TokenUsageSlice | null {
  if (!usage) return null;

  if (nodeId === "intent-router") {
    return asUsageSlice(usage.intent_router);
  }

  if (nodeId === "rag_private_kb") {
    const tool = readToolBlock(usage, "tool_rag", "rag");
    if (!tool) return null;
    return asUsageSlice(tool.total) ?? asUsageSlice(tool);
  }

  if (nodeId === "github-search") {
    const tool = readToolBlock(usage, "tool_github_search", "github_search");
    if (!tool) return null;
    return asUsageSlice(tool.total) ?? asUsageSlice(tool);
  }

  if (nodeId === "tavily-search") {
    const tool = readToolBlock(usage, "tool_tavily_search", "tavily_search");
    if (!tool) return null;
    return asUsageSlice(tool.total) ?? asUsageSlice(tool);
  }

  if (label === "Chat") {
    if (nodeId.includes("rag_private_kb")) {
      return (
        phaseUsageSlice(usage, "tool_rag", "chat") ?? phaseUsageSlice(usage, "rag", "chat")
      );
    }
    if (nodeId.includes("github")) {
      return phaseUsageSlice(usage, "tool_github_search", "chat");
    }
    if (nodeId.includes("tavily")) {
      return phaseUsageSlice(usage, "tool_tavily_search", "chat");
    }
  }

  if (label === "Follow-up Chat") {
    if (nodeId.includes("rag_private_kb")) {
      return (
        phaseUsageSlice(usage, "tool_rag", "follow_up_chat") ??
        phaseUsageSlice(usage, "rag", "follow_up_chat")
      );
    }
    if (nodeId.includes("github")) {
      return phaseUsageSlice(usage, "tool_github_search", "follow_up_chat");
    }
  }

  if (nodeId === "client" || nodeId === "bff" || nodeId === "gateway") {
    return asUsageSlice(usage.total) ?? asUsageSlice(usage);
  }

  return null;
}

function rollupMetrics(
  direct: NodeUsageMetrics,
  childTotals: NodeUsageMetrics,
  rootTokens: number,
): NodeUsageMetrics {
  const tokens = direct.tokens > 0 ? direct.tokens : childTotals.tokens;
  const costUsd = direct.costUsd > 0 ? direct.costUsd : childTotals.costUsd;
  return {
    tokens,
    costUsd,
    percent: rootTokens > 0 ? Math.round((tokens / rootTokens) * 100) : 0,
  };
}

function sumMetrics(list: NodeUsageMetrics[]): NodeUsageMetrics {
  const tokens = list.reduce((s, m) => s + m.tokens, 0);
  const costUsd = list.reduce((s, m) => s + m.costUsd, 0);
  return { tokens, costUsd, percent: 0 };
}

/** Walk the latency tree; every node gets metrics (0 when unmapped). */
export function buildUsageMetricsByNodeId(
  tree: LatencyTimelineNode[],
  usage: Record<string, unknown> | undefined,
): Map<string, NodeUsageMetrics> {
  const rootSlice = usage ? asUsageSlice(usage.total) ?? asUsageSlice(usage) : null;
  const rootTokens = rootSlice ? tokenCount(rootSlice) : 0;
  const map = new Map<string, NodeUsageMetrics>();

  const walk = (node: LatencyTimelineNode): NodeUsageMetrics => {
    const childMetrics = node.children.map(walk);
    const childTotals = sumMetrics(childMetrics);
    const direct = metricsFromSlice(
      usageSliceForTimelineNode(node.id, node.label, usage),
      rootTokens > 0 ? rootTokens : 1,
    );
    const merged = rollupMetrics(direct, childTotals, rootTokens > 0 ? rootTokens : 1);
    map.set(node.id, merged);
    return merged;
  };

  for (const node of tree) {
    walk(node);
  }
  return map;
}

export function rootUsageTotals(
  usage: Record<string, unknown> | undefined,
): { tokens: number; costUsd: number } {
  const slice = usage ? asUsageSlice(usage.total) ?? asUsageSlice(usage) : null;
  const tokens = slice ? tokenCount(slice) : 0;
  return { tokens, costUsd: slice ? estimateUsageCostUsd(slice) : 0 };
}
