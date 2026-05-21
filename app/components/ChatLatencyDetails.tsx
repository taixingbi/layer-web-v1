/**
 * Request timeline breakdown for assistant message latency.
 */

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

function SlowestSection({ slowest }: { slowest: LatencyTimelineView["slowest"] }) {
  if (slowest.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Slowest Operations</p>
      <pre className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre overflow-x-auto">
        {slowest.map((op) => {
          const dots = ".".repeat(Math.max(4, 28 - op.label.length));
          return `#${op.rank} ${op.label} ${dots} ${op.ms} ms (${op.percent}%)\n`;
        })}
      </pre>
    </div>
  );
}

function ClientTree({ view }: { view: LatencyTimelineView }) {
  const lines = renderTreeNodes(view.tree, 0, []);
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Client</p>
      <pre className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre overflow-x-auto">
        {lines.join("\n")}
      </pre>
    </div>
  );
}

export function ChatLatencyDetails({ latency_ms }: Props) {
  const view = buildLatencyTimelineView(latency_ms);
  if (!view) return null;

  return (
    <details className="mt-2.5 text-sm group">
      <summary className="cursor-pointer text-gray-500 dark:text-gray-400 select-none list-none flex items-center gap-1">
        <span className="text-[10px] transition-transform group-open:rotate-90">▶</span>
        Request Timeline ({view.totalSecondsLabel})
      </summary>
      <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50 px-3 py-2.5">
        <SlowestSection slowest={view.slowest} />
        <ClientTree view={view} />
      </div>
    </details>
  );
}
