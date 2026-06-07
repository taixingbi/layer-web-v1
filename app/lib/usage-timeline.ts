/**
 * Build a token-usage tree mirroring the latency timeline layout.
 */

import {
  asUsageSlice,
  estimateUsageCostUsd,
  formatUsageCost,
  formatUsageTokens,
  tokenCount,
} from "@/lib/chat-usage";
import type { TokenUsageSlice } from "@/lib/chat-types";

export type UsageTimelineNode = {
  id: string;
  label: string;
  tokens: number;
  costUsd: number;
  percent: number;
  children: UsageTimelineNode[];
};

export type UsageTimelineView = {
  totalTokens: number;
  totalCostUsd: number;
  totalCostLabel: string;
  tree: UsageTimelineNode[];
};

const TOOL_RAG_PRIVATE_KB_ID = "rag_private_kb";
const TOOL_RAG_PRIVATE_KB_LABEL = "Tool Rag Private KB";
const TOOL_GITHUB_SEARCH_ID = "github-search";
const TOOL_GITHUB_SEARCH_LABEL = "Tool Github Search";

function pct(tokens: number, rootTokens: number): number {
  if (rootTokens <= 0) return 0;
  return Math.round((tokens / rootTokens) * 100);
}

function readToolBlock(usage: Record<string, unknown>, ...keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const raw = usage[key];
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
  }
  return null;
}

function leafNode(
  id: string,
  label: string,
  slice: TokenUsageSlice,
  rootTokens: number,
): UsageTimelineNode {
  const tokens = tokenCount(slice);
  return {
    id,
    label,
    tokens,
    costUsd: estimateUsageCostUsd(slice),
    percent: pct(tokens, rootTokens),
    children: [],
  };
}

function rollupNode(
  id: string,
  label: string,
  slice: TokenUsageSlice | null,
  rootTokens: number,
  children: UsageTimelineNode[],
): UsageTimelineNode | null {
  const childTokens = children.reduce((sum, c) => sum + c.tokens, 0);
  const childCost = children.reduce((sum, c) => sum + c.costUsd, 0);
  const directTokens = slice ? tokenCount(slice) : 0;
  const tokens = directTokens > 0 ? directTokens : childTokens;
  if (tokens <= 0) return null;
  const costUsd =
    slice && directTokens > 0 ? estimateUsageCostUsd(slice) : childCost > 0 ? childCost : 0;
  return {
    id,
    label,
    tokens,
    costUsd,
    percent: pct(tokens, rootTokens),
    children,
  };
}

function toolPhaseChildren(
  tool: Record<string, unknown>,
  prefix: string,
  rootTokens: number,
  pairs: Array<[string, string]>,
): UsageTimelineNode[] {
  const out: UsageTimelineNode[] = [];
  for (const [key, label] of pairs) {
    const slice = asUsageSlice(tool[key]);
    if (slice && tokenCount(slice) > 0) {
      out.push(leafNode(`${prefix}-${key}`, label, slice, rootTokens));
    }
  }
  return out;
}

function ragToolNode(usage: Record<string, unknown>, rootTokens: number): UsageTimelineNode | null {
  const tool = readToolBlock(usage, "tool_rag", "rag");
  if (!tool) return null;
  const children = toolPhaseChildren(tool, TOOL_RAG_PRIVATE_KB_ID, rootTokens, [
    ["chat", "Chat"],
    ["follow_up_chat", "Follow-up Chat"],
  ]);
  return rollupNode(
    TOOL_RAG_PRIVATE_KB_ID,
    TOOL_RAG_PRIVATE_KB_LABEL,
    asUsageSlice(tool.total) ?? asUsageSlice(tool),
    rootTokens,
    children,
  );
}

function githubToolNode(usage: Record<string, unknown>, rootTokens: number): UsageTimelineNode | null {
  const tool = readToolBlock(usage, "tool_github_search", "github_search");
  if (!tool) return null;
  const children = toolPhaseChildren(tool, TOOL_GITHUB_SEARCH_ID, rootTokens, [
    ["chat", "Chat"],
    ["follow_up_chat", "Follow-up Chat"],
  ]);
  return rollupNode(
    TOOL_GITHUB_SEARCH_ID,
    TOOL_GITHUB_SEARCH_LABEL,
    asUsageSlice(tool.total) ?? asUsageSlice(tool),
    rootTokens,
    children,
  );
}

function tavilyToolNode(usage: Record<string, unknown>, rootTokens: number): UsageTimelineNode | null {
  const tool = readToolBlock(usage, "tool_tavily_search", "tavily_search");
  if (!tool) return null;
  const children = toolPhaseChildren(tool, "tavily-search", rootTokens, [
    ["web_search", "Web Search"],
    ["chat", "Chat"],
  ]);
  return rollupNode(
    "tavily-search",
    "Tavily Search",
    asUsageSlice(tool.total) ?? asUsageSlice(tool),
    rootTokens,
    children,
  );
}

function buildOrchestratorChildren(usage: Record<string, unknown>, rootTokens: number): UsageTimelineNode[] {
  const out: UsageTimelineNode[] = [];
  const routerSlice = asUsageSlice(usage.intent_router);
  if (routerSlice && tokenCount(routerSlice) > 0) {
    out.push(leafNode("intent-router", "Router", routerSlice, rootTokens));
  }
  for (const build of [ragToolNode, githubToolNode, tavilyToolNode]) {
    const node = build(usage, rootTokens);
    if (node) out.push(node);
  }
  return out;
}

function rootUsageSlice(usage: Record<string, unknown>): TokenUsageSlice | null {
  return asUsageSlice(usage.total) ?? asUsageSlice(usage);
}

/** Build usage tree aligned with the latency timeline (orchestrator branch). */
export function buildUsageTimelineView(
  usage: Record<string, unknown> | undefined,
): UsageTimelineView | null {
  if (!usage) return null;

  const rootSlice = rootUsageSlice(usage);
  let rootTokens = rootSlice ? tokenCount(rootSlice) : 0;
  const orchestratorChildren = buildOrchestratorChildren(usage, rootTokens > 0 ? rootTokens : 1);
  if (rootTokens <= 0) {
    rootTokens = orchestratorChildren.reduce((sum, n) => sum + n.tokens, 0);
  }
  if (rootTokens <= 0) return null;

  const orchestratorNode = rollupNode(
    "orchestrator",
    "Orchestrator",
    null,
    rootTokens,
    orchestratorChildren,
  );
  if (!orchestratorNode) return null;

  const gatewayNode = rollupNode("gateway", "Gateway", rootSlice, rootTokens, [orchestratorNode]);
  const bffNode = rollupNode("bff", "BFF Route", rootSlice, rootTokens, gatewayNode ? [gatewayNode] : []);
  const clientNode = rollupNode("client", "Web Client", rootSlice, rootTokens, bffNode ? [bffNode] : []);
  if (!clientNode) return null;

  const totalCostUsd =
    rootSlice && tokenCount(rootSlice) > 0
      ? estimateUsageCostUsd(rootSlice)
      : clientNode.costUsd;

  return {
    totalTokens: rootTokens,
    totalCostUsd,
    totalCostLabel: formatUsageCost(totalCostUsd),
    tree: [clientNode],
  };
}

/** Pad label + dots so token/cost columns align (monospace). */
export function formatUsageLine(
  label: string,
  tokens: number,
  costUsd: number,
  opts?: { prefix?: string; connector?: string; labelWidth?: number },
): string {
  const prefix = opts?.prefix ?? "";
  const connector = opts?.connector ?? "└─ ";
  const labelWidth = opts?.labelWidth ?? 22;
  const labelPart = label.padEnd(labelWidth, " ");
  const valuePart = `${formatUsageTokens(tokens)}   ${formatUsageCost(costUsd)}`;
  const used = prefix.length + connector.length + labelPart.length + 1;
  const dots = Math.max(6, 52 - used - valuePart.length);
  return `${prefix}${connector}${labelPart} ${".".repeat(dots)} ${valuePart}`;
}
