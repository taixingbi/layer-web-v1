"use client";

import {
  buildLatencyTimelineView,
  formatTimelineLine,
  type LatencyTimelineNode,
  type LatencyTimelineView,
} from "@/lib/latency-timeline";
import { type LatencyObject } from "@/lib/chat-latency";

type Props = {
  latency_ms: LatencyObject;
};

function renderTreeNodes(
  nodes: LatencyTimelineNode[],
  depth: number,
  parentIsLast: boolean[],
): string[] {
  const lines: string[] = [];
  nodes.forEach((n, index) => {
    const isLast = index === nodes.length - 1;
    const prefix = depth === 0 ? "" : parentIsLast.map((last) => (last ? "   " : "│  ")).join("");
    const connector = depth === 0 ? "└─ " : isLast ? "└─ " : "├─ ";
    lines.push(
      formatTimelineLine(n.label, n.ms, n.percent, {
        rank: n.rank,
        prefix,
        connector,
      }),
    );
    if (n.children.length > 0) {
      lines.push(...renderTreeNodes(n.children, depth + 1, [...parentIsLast, isLast]));
    }
  });
  return lines;
}

function RequestTimelineTree({ view }: { view: LatencyTimelineView }) {
  const lines = renderTreeNodes(view.tree, 0, []);
  return (
    <div className="chat-latency-tree-wrap">
      <p className="chat-latency-tree-label">Request timeline</p>
      <pre className="chat-latency-tree">{lines.join("\n")}</pre>
    </div>
  );
}

export function LatencyTimelinePanel({ latency_ms }: Props) {
  const view = buildLatencyTimelineView(latency_ms);
  if (!view) return null;
  return (
    <div className="chat-latency-panel">
      <RequestTimelineTree view={view} />
    </div>
  );
}
