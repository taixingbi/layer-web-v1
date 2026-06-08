import { describe, expect, it } from "vitest";
import { tokenCount } from "./chat-usage";
import { buildLatencyTimelineView } from "./latency-timeline";
import { mergeClientLatency, mergeGatewayLatencyWithBff } from "./chat-latency";
import { buildUsageMetricsByNodeId, usageSliceForTimelineNode } from "./timeline-usage-map";
import { formatUsageLine } from "./usage-timeline";

const gatewayBody = {
  total: 4800,
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

const sampleUsage = {
  total_tokens: 1308,
  intent_router: { total_tokens: 576 },
  tool_rag: {
    chat: { total_tokens: 353 },
    follow_up_chat: { total_tokens: 522 },
    total: { total_tokens: 875 },
  },
};

describe("usageSliceForTimelineNode", () => {
  it("maps router and rag chat phases", () => {
    expect(tokenCount(usageSliceForTimelineNode("intent-router", "Router", sampleUsage)!)).toBe(
      576,
    );
    expect(
      tokenCount(
        usageSliceForTimelineNode(
          "rag_private_kb-generation-answer",
          "RAG answer generation",
          sampleUsage,
        )!,
      ),
    ).toBe(353);
  });

  it("maps suggested questions phase to follow_up_chat usage", () => {
    expect(
      tokenCount(
        usageSliceForTimelineNode(
          "rag_private_kb-generation-follow_up",
          "Suggested questions",
          sampleUsage,
        )!,
      ),
    ).toBe(522);
  });

  it("returns null for embed (zero tokens, row still kept in tree)", () => {
    expect(
      usageSliceForTimelineNode("rag_private_kb-retrieval-embed", "Query embedding", sampleUsage),
    ).toBeNull();
  });
});

describe("buildUsageMetricsByNodeId", () => {
  it("keeps embed row with zero tokens", () => {
    const partial = mergeGatewayLatencyWithBff(gatewayBody, { routeMs: 4824 })!;
    const envelope = mergeClientLatency(partial, 4844)!;
    const view = buildLatencyTimelineView(envelope)!;
    const metrics = buildUsageMetricsByNodeId(view.tree, sampleUsage);

    const orchestrator = view.tree[0].children[0]?.children[0]?.children[0];
    const rag = orchestrator?.children.find((c) => c.label === "Tool Rag Private KB");
    const embed = rag?.children.find((c) => c.label === "Query embedding");
    expect(embed).toBeDefined();
    expect(metrics.get(embed!.id)?.tokens).toBe(0);
    expect(metrics.get("intent-router")?.tokens).toBe(576);
  });
});

describe("formatUsageLine", () => {
  it("formats one line with tokens and cost", () => {
    const line = formatUsageLine("Router", 576, 0.0002);
    expect(line).toContain("576 tok");
    expect(line).toContain("$0.0002");
  });

  it("shows label only when tokens are zero", () => {
    expect(formatUsageLine("Query embedding", 0, 0, { connector: "├─ " })).toBe(
      "├─ Query embedding",
    );
  });
});
