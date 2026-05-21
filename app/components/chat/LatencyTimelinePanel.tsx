"use client";

import {
  buildLatencyTimelineView,
  formatTimelineLine,
  shortSlowestLabel,
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

function TopLatencySummary({ slowest }: { slowest: LatencyTimelineView["slowest"] }) {
  if (slowest.length === 0) return null;
  const line = slowest
    .slice(0, 3)
    .map((op) => `${shortSlowestLabel(op.label)} ${op.percent}%`)
    .join(" · ");
  return (
    <div className="chat-latency-top">
      <p className="chat-latency-top-label">Top latency</p>
      <p className="chat-latency-top-line">{line}</p>
    </div>
  );
}

function SlowestRanked({ slowest }: { slowest: LatencyTimelineView["slowest"] }) {
  if (slowest.length === 0) return null;
  return (
    <ul className="chat-latency-ranked">
      {slowest.map((op) => (
        <li key={op.rank}>
          #{op.rank} {op.label} {op.percent}%
        </li>
      ))}
    </ul>
  );
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
      <TopLatencySummary slowest={view.slowest} />
      <SlowestRanked slowest={view.slowest} />
      <RequestTimelineTree view={view} />
    </div>
  );
}
