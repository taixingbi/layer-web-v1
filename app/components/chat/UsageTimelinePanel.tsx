"use client";

import { useMemo } from "react";
import {
  buildUsageTimelineView,
  formatUsageLine,
  type UsageTimelineNode,
  type UsageTimelineView,
} from "@/lib/usage-timeline";
import {
  firstRepoLinkNodeIds,
  timelineNodeRepoName,
  timelineNodeRepoUrl,
} from "@/lib/latency-timeline-repos";
import { formatUsageCost, formatUsageTokens } from "@/lib/chat-usage";

type Props = {
  usage?: Record<string, unknown>;
};

function timelineMaxTokens(nodes: UsageTimelineNode[]): number {
  let max = 1;
  const walk = (list: UsageTimelineNode[]) => {
    for (const n of list) {
      if (n.tokens > max) max = n.tokens;
      walk(n.children);
    }
  };
  walk(nodes);
  return max;
}

function GitHubRepoLink({ nodeId }: { nodeId: string }) {
  const href = timelineNodeRepoUrl(nodeId);
  const repo = timelineNodeRepoName(nodeId);
  if (!href || !repo) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="chat-latency-repo-link"
      title={`${repo} on GitHub`}
      aria-label={`${repo} on GitHub`}
      onClick={(e) => e.stopPropagation()}
    >
      <GitHubMark />
    </a>
  );
}

function GitHubMark() {
  return (
    <svg
      className="chat-latency-repo-icon"
      viewBox="0 0 16 16"
      width={14}
      height={14}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  );
}

function UsageRow({
  node,
  depth,
  parentIsLast,
  index,
  siblingCount,
  repoLinkNodeIds,
  maxTokens,
}: {
  node: UsageTimelineNode;
  depth: number;
  parentIsLast: boolean[];
  index: number;
  siblingCount: number;
  repoLinkNodeIds: Set<string>;
  maxTokens: number;
}) {
  const isLast = index === siblingCount - 1;
  const prefix = depth === 0 ? "" : parentIsLast.map((last) => (last ? "   " : "│  ")).join("");
  const connector = depth === 0 ? "└─ " : isLast ? "└─ " : "├─ ";
  const line = formatUsageLine(node.label, node.tokens, node.costUsd, { prefix, connector });
  const showRepoLink = repoLinkNodeIds.has(node.id);
  const barWidth = Math.max(4, Math.round((node.tokens / maxTokens) * 100));

  return (
    <>
      <div className="chat-latency-row-block">
        <div className="chat-latency-row">
          <pre className="chat-latency-line">{line}</pre>
          {showRepoLink ? <GitHubRepoLink nodeId={node.id} /> : null}
        </div>
        <div
          className="chat-latency-bar-track"
          style={{ paddingLeft: `${prefix.length + connector.length}ch` }}
        >
          <div
            className="chat-latency-bar-fill"
            style={{ width: `${barWidth}%` }}
            title={`${formatUsageTokens(node.tokens)} (${node.percent}%) · ${formatUsageCost(node.costUsd)}`}
          />
        </div>
      </div>
      {node.children.length > 0
        ? node.children.map((child, childIndex) => (
            <UsageRow
              key={child.id}
              node={child}
              depth={depth + 1}
              parentIsLast={[...parentIsLast, isLast]}
              index={childIndex}
              siblingCount={node.children.length}
              repoLinkNodeIds={repoLinkNodeIds}
              maxTokens={maxTokens}
            />
          ))
        : null}
    </>
  );
}

function UsageTimelineTree({ view }: { view: UsageTimelineView }) {
  const repoLinkNodeIds = useMemo(() => firstRepoLinkNodeIds(view.tree), [view.tree]);
  const maxTokens = useMemo(() => timelineMaxTokens(view.tree), [view.tree]);

  return (
    <div className="chat-latency-tree-wrap">
      <p className="chat-latency-tree-label">
        Token usage · {formatUsageTokens(view.totalTokens)} · {view.totalCostLabel}
      </p>
      <div className="chat-latency-tree">
        {view.tree.map((node, index) => (
          <UsageRow
            key={node.id}
            node={node}
            depth={0}
            parentIsLast={[]}
            index={index}
            siblingCount={view.tree.length}
            repoLinkNodeIds={repoLinkNodeIds}
            maxTokens={maxTokens}
          />
        ))}
      </div>
    </div>
  );
}

export function UsageTimelinePanel({ usage }: Props) {
  const view = usage ? buildUsageTimelineView(usage) : null;
  if (!view) {
    return <p className="chat-debug-empty">No token usage for this reply.</p>;
  }
  return (
    <div className="chat-latency-panel">
      <UsageTimelineTree view={view} />
    </div>
  );
}
