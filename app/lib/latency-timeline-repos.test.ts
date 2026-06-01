import { describe, expect, it } from "vitest";
import { buildLatencyTimelineView } from "./latency-timeline";
import { firstRepoLinkNodeIds } from "./latency-timeline-repos";
import { timelineNodeRepoName, timelineNodeRepoUrl } from "./latency-timeline-repos";
import { mergeClientLatency, mergeGatewayLatencyWithBff } from "./chat-latency";

const gatewayBody = {
  total: 4800,
  auth: 229,
  storage: { total: 831, write_user_message: 575, write_assistant_message: 256 },
  orchestrator: {
    proxy_total: 3740,
    workflow: {
      total: 3724,
      intent_router: 1371,
      rag: {
        total: 2344,
        retrieval: { total: 306, embed: 95, retrieve: 55, rerank: 160 },
        generation: { total: 1930, answer: 428, follow_up: 1512 },
      },
    },
  },
};

describe("timelineNodeRepoUrl", () => {
  it("maps pipeline layers to taixingbi repos", () => {
    expect(timelineNodeRepoUrl("client")).toBe("https://github.com/taixingbi/layer-web-v1");
    expect(timelineNodeRepoUrl("gateway")).toBe(
      "https://github.com/taixingbi/layer-gateway-api-v1",
    );
    expect(timelineNodeRepoUrl("orchestrator")).toBe(
      "https://github.com/taixingbi/layer-orchestrator-v1",
    );
    expect(timelineNodeRepoUrl("github-search")).toBe(
      "https://github.com/taixingbi/layer-mcp-github-v1",
    );
    expect(timelineNodeRepoUrl("rag-retrieval-embed")).toBe(
      "https://github.com/taixingbi/layer-gateway-embed-v1",
    );
    expect(timelineNodeRepoUrl("rag")).toBe("https://github.com/taixingbi/layer-rag-query-v1");
  });

  it("exposes repo slug for tooltips", () => {
    expect(timelineNodeRepoName("gateway")).toBe("layer-gateway-api-v1");
  });
});

describe("firstRepoLinkNodeIds", () => {
  it("returns one node id per unique repo URL", () => {
    const partial = mergeGatewayLatencyWithBff(gatewayBody, { routeMs: 4824 })!;
    const envelope = mergeClientLatency(partial, 4844)!;
    const view = buildLatencyTimelineView(envelope)!;
    const linkIds = firstRepoLinkNodeIds(view.tree);

    const urls = [...linkIds].map((id) => timelineNodeRepoUrl(id));
    expect(new Set(urls).size).toBe(urls.length);
    expect(linkIds.has("client")).toBe(true);
    expect(linkIds.has("gateway")).toBe(true);
    expect(linkIds.has("rag")).toBe(true);
    expect(linkIds.has("rag-retrieval-embed")).toBe(true);
    expect(linkIds.has("intent-router")).toBe(false);
  });
});
