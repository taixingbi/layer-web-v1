/**
 * Map latency timeline node ids to HuntAI GitHub repos (taixingbi org).
 */

import type { LatencyTimelineNode } from "@/lib/latency-timeline";

const GITHUB_ORG = "taixingbi";

function repoUrl(repo: string): string {
  return `https://github.com/${GITHUB_ORG}/${repo}`;
}

/** GitHub repo URL for a timeline node, or null when unknown. */
export function timelineNodeRepoUrl(nodeId: string): string | null {
  if (nodeId === "client" || nodeId === "bff") {
    return repoUrl("layer-web-v1");
  }
  if (
    nodeId === "gateway" ||
    nodeId === "auth" ||
    nodeId === "validation" ||
    nodeId === "storage" ||
    nodeId.startsWith("storage-")
  ) {
    return repoUrl("layer-gateway-api-v1");
  }
  if (nodeId === "orchestrator" || nodeId === "intent-router") {
    return repoUrl("layer-orchestrator-v1");
  }
  if (nodeId === "github-search" || nodeId.startsWith("github-")) {
    return repoUrl("layer-mcp-github-v1");
  }
  if (nodeId === "tavily-search" || nodeId.startsWith("tavily-")) {
    return repoUrl("layer-orchestrator-v1");
  }
  if (nodeId.includes("embed")) {
    return repoUrl("layer-gateway-embed-v1");
  }
  if (nodeId.includes("rerank")) {
    return repoUrl("layer-gateway-reranker-v1");
  }
  if (nodeId === "rag" || nodeId.startsWith("rag-")) {
    return repoUrl("layer-rag-query-v1");
  }
  return null;
}

/** Short repo name for link tooltips (e.g. ``layer-web-v1``). */
export function timelineNodeRepoName(nodeId: string): string | null {
  const url = timelineNodeRepoUrl(nodeId);
  if (!url) return null;
  return url.split("/").pop() ?? null;
}

/** First timeline node per repo URL — only those rows should show a GitHub link. */
export function firstRepoLinkNodeIds(nodes: LatencyTimelineNode[]): Set<string> {
  const seenUrls = new Set<string>();
  const ids = new Set<string>();
  const walk = (list: LatencyTimelineNode[]) => {
    for (const n of list) {
      const url = timelineNodeRepoUrl(n.id);
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        ids.add(n.id);
      }
      walk(n.children);
    }
  };
  walk(nodes);
  return ids;
}
