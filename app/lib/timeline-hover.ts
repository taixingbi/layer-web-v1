/** Map execution-timeline node ids/labels to hover detail panels. */

import {
  isChatTimelineLabel,
  isEmbedTimelineLabel,
} from "@/lib/timeline-phase-labels";

export type TimelineHoverKind = "router" | "rag_tool" | "embed" | "chat";

const ROUTER_NODE_ID = "intent-router";
const TOOL_RAG_PRIVATE_KB_ID = "rag_private_kb";

export function timelineHoverKind(nodeId: string, label: string): TimelineHoverKind | null {
  if (nodeId === ROUTER_NODE_ID) return "router";
  if (nodeId === TOOL_RAG_PRIVATE_KB_ID) return "rag_tool";
  if (isEmbedTimelineLabel(label)) return "embed";
  if (isChatTimelineLabel(label)) return "chat";
  return null;
}

/** Usage envelope key for a main ``Chat`` timeline row (not follow-up). */
export function chatUsageToolKey(nodeId: string): "tool_rag" | "tool_github_search" {
  if (nodeId.includes("github")) return "tool_github_search";
  return "tool_rag";
}
