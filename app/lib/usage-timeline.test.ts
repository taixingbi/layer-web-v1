import { describe, expect, it } from "vitest";
import { buildUsageTimelineView, formatUsageLine } from "./usage-timeline";

const sampleUsage = {
  prompt_tokens: 1145,
  completion_tokens: 163,
  total_tokens: 1308,
  intent_router: { prompt_tokens: 516, completion_tokens: 60, total_tokens: 576 },
  tool_rag: {
    chat: { prompt_tokens: 328, completion_tokens: 25, total_tokens: 353 },
    follow_up_chat: { prompt_tokens: 429, completion_tokens: 93, total_tokens: 522 },
    total: { prompt_tokens: 757, completion_tokens: 118, total_tokens: 875 },
  },
};

describe("buildUsageTimelineView", () => {
  it("builds client → orchestrator tree with router and rag phases", () => {
    const view = buildUsageTimelineView(sampleUsage);
    expect(view).not.toBeNull();
    expect(view!.totalTokens).toBe(1308);

    const client = view!.tree[0];
    expect(client.label).toBe("Web Client");
    const orchestrator = client.children[0]?.children[0]?.children[0];
    expect(orchestrator?.label).toBe("Orchestrator");
    expect(orchestrator?.children.map((c) => c.label)).toEqual([
      "Router",
      "Tool Rag Private KB",
    ]);

    const router = orchestrator?.children.find((c) => c.label === "Router");
    expect(router?.tokens).toBe(576);

    const rag = orchestrator?.children.find((c) => c.label === "Tool Rag Private KB");
    expect(rag?.children.map((c) => c.label)).toEqual(["Chat", "Follow-up Chat"]);
  });
});

describe("formatUsageLine", () => {
  it("formats tokens and estimated cost on one line", () => {
    const line = formatUsageLine("Router", 576, 0.0002);
    expect(line).toContain("Router");
    expect(line).toContain("576 tok");
    expect(line).toContain("$0.0002");
    expect(line).not.toContain("ms");
  });
});
