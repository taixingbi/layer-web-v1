/** Map execution-timeline node ids/labels to hover detail panels. */

export type TimelineHoverKind = "router" | "embed" | "chat";

const ROUTER_NODE_ID = "intent-router";

export function timelineHoverKind(nodeId: string, label: string): TimelineHoverKind | null {
  if (nodeId === ROUTER_NODE_ID) return "router";
  if (label === "Embed") return "embed";
  if (label === "Chat") return "chat";
  return null;
}

/** Usage envelope key for a main ``Chat`` timeline row (not follow-up). */
export function chatUsageToolKey(nodeId: string): "tool_rag" | "tool_github_search" {
  if (nodeId.includes("github")) return "tool_github_search";
  return "tool_rag";
}
