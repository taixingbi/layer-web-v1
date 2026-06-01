"use client";

import { useMemo } from "react";
import {
  buildLatencyTimelineView,
  formatTimelineLine,
  type LatencyTimelineNode,
  type LatencyTimelineView,
} from "@/lib/latency-timeline";
import {
  firstRepoLinkNodeIds,
  timelineNodeRepoName,
  timelineNodeRepoUrl,
} from "@/lib/latency-timeline-repos";
import { type LatencyObject } from "@/lib/chat-latency";

type Props = {
  latency_ms: LatencyObject;
};

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

function TimelineRow({
  node,
  depth,
  parentIsLast,
  index,
  siblingCount,
  repoLinkNodeIds,
}: {
  node: LatencyTimelineNode;
  depth: number;
  parentIsLast: boolean[];
  index: number;
  siblingCount: number;
  repoLinkNodeIds: Set<string>;
}) {
  const isLast = index === siblingCount - 1;
  const prefix = depth === 0 ? "" : parentIsLast.map((last) => (last ? "   " : "│  ")).join("");
  const connector = depth === 0 ? "└─ " : isLast ? "└─ " : "├─ ";
  const line = formatTimelineLine(node.label, node.ms, node.percent, {
    rank: node.rank,
    prefix,
    connector,
  });
  const showRepoLink = repoLinkNodeIds.has(node.id);

  return (
    <>
      <div className="chat-latency-row">
        <pre className="chat-latency-line">{line}</pre>
        {showRepoLink ? <GitHubRepoLink nodeId={node.id} /> : null}
      </div>
      {node.children.length > 0
        ? node.children.map((child, childIndex) => (
            <TimelineRow
              key={child.id}
              node={child}
              depth={depth + 1}
              parentIsLast={[...parentIsLast, isLast]}
              index={childIndex}
              siblingCount={node.children.length}
              repoLinkNodeIds={repoLinkNodeIds}
            />
          ))
        : null}
    </>
  );
}

function RequestTimelineTree({ view }: { view: LatencyTimelineView }) {
  const repoLinkNodeIds = useMemo(() => firstRepoLinkNodeIds(view.tree), [view.tree]);

  return (
    <div className="chat-latency-tree-wrap">
      <p className="chat-latency-tree-label">Request timeline</p>
      <div className="chat-latency-tree">
        {view.tree.map((node, index) => (
          <TimelineRow
            key={node.id}
            node={node}
            depth={0}
            parentIsLast={[]}
            index={index}
            siblingCount={view.tree.length}
            repoLinkNodeIds={repoLinkNodeIds}
          />
        ))}
      </div>
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
