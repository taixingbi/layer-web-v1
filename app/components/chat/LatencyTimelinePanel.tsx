"use client";

import { useMemo } from "react";
import { DebugChatPanel } from "@/components/chat/DebugChatPanel";
import { DebugEmbedPanel } from "@/components/chat/DebugEmbedPanel";
import { DebugRoutePanel } from "@/components/chat/DebugRoutePanel";
import { TimelineHoverWrap } from "@/components/chat/TimelineHoverWrap";
import {
  buildLatencyTimelineView,
  formatLatencyShort,
  formatTimelineLine,
  type LatencyTimelineNode,
  type LatencyTimelineView,
} from "@/lib/latency-timeline";
import {
  firstRepoLinkNodeIds,
  timelineNodeRepoName,
  timelineNodeRepoUrl,
} from "@/lib/latency-timeline-repos";
import { phaseUsageSlice } from "@/lib/chat-usage";
import { type LatencyObject } from "@/lib/chat-latency";
import type { ChatMessage } from "@/lib/chat-types";
import { chatUsageToolKey, timelineHoverKind, type TimelineHoverKind } from "@/lib/timeline-hover";

const ROUTER_NODE_ID = "intent-router";

type RouteInfo = Pick<ChatMessage, "route" | "route_detail" | "route_source" | "model">;

type TimelineHoverContext = RouteInfo & {
  usage?: Record<string, unknown>;
  citationCount: number;
};

type Props = Pick<TimelineHoverContext, keyof RouteInfo | "usage"> & {
  latency_ms?: LatencyObject;
  citations?: ChatMessage["citations"];
};

function hasRouteInfo(info: RouteInfo | null | undefined): boolean {
  if (!info) return false;
  return Boolean(
    info.route?.trim() ||
      info.route_detail?.name?.trim() ||
      info.route_detail?.reason?.trim() ||
      info.route_detail?.type?.trim() ||
      info.route_source?.trim() ||
      info.model?.trim(),
  );
}

function hasTimelineHoverContent(kind: TimelineHoverKind, nodeId: string, ctx: TimelineHoverContext): boolean {
  if (kind === "router") return hasRouteInfo(ctx);
  if (kind === "embed") return true;
  if (kind === "chat") {
    const tokens = phaseUsageSlice(ctx.usage, chatUsageToolKey(nodeId), "chat");
    return Boolean(
      ctx.model?.trim() ||
        tokens ||
        ctx.citationCount > 0,
    );
  }
  return false;
}

function treeHasNode(nodes: LatencyTimelineNode[], id: string): boolean {
  for (const node of nodes) {
    if (node.id === id) return true;
    if (treeHasNode(node.children, id)) return true;
  }
  return false;
}

function timelineMaxMs(nodes: LatencyTimelineNode[]): number {
  let max = 1;
  const walk = (list: LatencyTimelineNode[]) => {
    for (const n of list) {
      if (n.ms > max) max = n.ms;
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

function TimelineHoverPopover({
  kind,
  nodeId,
  hoverCtx,
}: {
  kind: TimelineHoverKind;
  nodeId: string;
  hoverCtx: TimelineHoverContext;
}) {
  return (
    <div className="chat-latency-hover-popover" role="tooltip">
      {kind === "router" ? (
        <DebugRoutePanel
          route={hoverCtx.route}
          route_detail={hoverCtx.route_detail}
          route_source={hoverCtx.route_source}
          model={hoverCtx.model}
        />
      ) : null}
      {kind === "embed" ? <DebugEmbedPanel /> : null}
      {kind === "chat" ? (
        <DebugChatPanel
          nodeId={nodeId}
          model={hoverCtx.model}
          usage={hoverCtx.usage}
          citationCount={hoverCtx.citationCount}
        />
      ) : null}
    </div>
  );
}

function TimelineRow({
  node,
  depth,
  parentIsLast,
  index,
  siblingCount,
  repoLinkNodeIds,
  maxMs,
  hoverCtx,
}: {
  node: LatencyTimelineNode;
  depth: number;
  parentIsLast: boolean[];
  index: number;
  siblingCount: number;
  repoLinkNodeIds: Set<string>;
  maxMs: number;
  hoverCtx: TimelineHoverContext;
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
  const hoverKind = timelineHoverKind(node.id, node.label);
  const showHover =
    hoverKind != null && hasTimelineHoverContent(hoverKind, node.id, hoverCtx);

  const barWidth = Math.max(4, Math.round((node.ms / maxMs) * 100));

  const rowBlock = (
    <div className={`chat-latency-row-block${showHover ? " is-timeline-hover" : ""}`}>
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
          title={`${formatLatencyShort(node.ms)} (${node.percent}%)`}
        />
      </div>
    </div>
  );

  return (
    <>
      {showHover && hoverKind ? (
        <TimelineHoverWrap
          enabled
          popover={
            <TimelineHoverPopover kind={hoverKind} nodeId={node.id} hoverCtx={hoverCtx} />
          }
        >
          <div className="chat-latency-row-scroll">{rowBlock}</div>
        </TimelineHoverWrap>
      ) : (
        rowBlock
      )}
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
              maxMs={maxMs}
              hoverCtx={hoverCtx}
            />
          ))
        : null}
    </>
  );
}

function RequestTimelineTree({
  view,
  hoverCtx,
}: {
  view: LatencyTimelineView;
  hoverCtx: TimelineHoverContext;
}) {
  const repoLinkNodeIds = useMemo(() => firstRepoLinkNodeIds(view.tree), [view.tree]);
  const maxMs = useMemo(() => timelineMaxMs(view.tree), [view.tree]);

  return (
    <div className="chat-latency-tree-wrap">
      <p className="chat-latency-tree-label">Execution timeline</p>
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
            maxMs={maxMs}
            hoverCtx={hoverCtx}
          />
        ))}
      </div>
    </div>
  );
}

export function LatencyTimelinePanel({
  latency_ms,
  route,
  route_detail,
  route_source,
  model,
  usage,
  citations,
}: Props) {
  const view = latency_ms ? buildLatencyTimelineView(latency_ms) : null;
  const hoverCtx: TimelineHoverContext = {
    route,
    route_detail,
    route_source,
    model,
    usage,
    citationCount: citations?.length ?? 0,
  };
  const routeInfo = hasRouteInfo(hoverCtx) ? hoverCtx : null;

  if (!view && !routeInfo) return null;

  const routerInTree = view ? treeHasNode(view.tree, ROUTER_NODE_ID) : false;

  return (
    <div className="chat-latency-panel">
      {view ? <RequestTimelineTree view={view} hoverCtx={hoverCtx} /> : null}
      {routeInfo && (!view || !routerInTree) ? (
        <div className={view ? "chat-latency-route-fallback" : undefined}>
          <DebugRoutePanel
            route={routeInfo.route}
            route_detail={routeInfo.route_detail}
            route_source={routeInfo.route_source}
            model={routeInfo.model}
          />
        </div>
      ) : null}
    </div>
  );
}
