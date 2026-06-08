/**
 * Unit tests for {@link latency-timeline}.
 */

import { describe, expect, it } from "vitest";
import {
  buildLatencyTimelineView,
  formatLatencyShort,
  formatTimelineLine,
  formatTimelineSeconds,
  shortSlowestLabel,
} from "./latency-timeline";
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
        follow_up_rerank: 77,
      },
    },
  },
};

describe("buildLatencyTimelineView", () => {
  it("builds client → gateway tree and ranks slowest ops", () => {
    const partial = mergeGatewayLatencyWithBff(gatewayBody, { routeMs: 4824 })!;
    const envelope = mergeClientLatency(partial, 4844)!;
    const view = buildLatencyTimelineView(envelope);
    expect(view).not.toBeNull();
    expect(view!.totalMs).toBe(4844);
    expect(view!.totalSecondsLabel).toBe("4.84s");
    expect(view!.slowest[0]).toMatchObject({ rank: 1, label: "Follow-up Chat", ms: 1512 });
    expect(view!.slowest[1]).toMatchObject({ rank: 2, label: "Router", ms: 1371 });
    expect(view!.slowest[2]).toMatchObject({ rank: 3, label: "Storage", ms: 831 });

    const client = view!.tree[0];
    expect(client.label).toBe("Web Client");
    const gateway = client.children[0]?.children[0];
    expect(gateway?.label).toBe("Gateway");
    const orchestrator = gateway?.children.find((c) => c.label === "Orchestrator");
    expect(orchestrator?.children.some((c) => c.label === "Workflow")).toBe(false);
    expect(orchestrator?.children.some((c) => c.label === "Tool Rag Private KB")).toBe(true);

    const followUp = orchestrator?.children
      .find((c) => c.label === "Tool Rag Private KB")
      ?.children.find((c) => c.label === "Follow-up Chat");
    expect(followUp?.rank).toBe(1);
  });

  it("shows Tool Github Search downstream instead of Workflow wrapper", () => {
    const body = {
      ...gatewayBody,
      orchestrator: {
        proxy_total: 5000,
        workflow: {
          total: 4800,
          intent_router: { total: 1200 },
          tool_github_search: {
            total: 3500,
            retrieve_rerank: 800,
            chat: 2200,
            follow_up_chat: 500,
          },
        },
      },
    };
    const view = buildLatencyTimelineView({ gateway_api: body, total: 5000 });
    const orch = view!.tree[0].children[0]?.children.find((c) => c.label === "Orchestrator");
    expect(orch?.children.map((c) => c.label)).toEqual(["Router", "Tool Github Search"]);
    const github = orch?.children.find((c) => c.label === "Tool Github Search");
    expect(github?.children.some((c) => c.label === "Answer generation")).toBe(true);
  });

  it("supports gateway-only metadata from history", () => {
    const view = buildLatencyTimelineView({ gateway_api: gatewayBody, total: 4800 });
    expect(view!.totalMs).toBe(4800);
    expect(view!.tree[0].label).toBe("Web Client");
    expect(view!.tree[0].children[0]?.label).toBe("Gateway");
    expect(view!.tree[0].children[0]?.children.some((c) => c.label === "Storage")).toBe(true);
  });
});

describe("formatTimelineLine", () => {
  it("formats a ranked slowest line", () => {
    const line = formatTimelineLine("Follow-up Chat", 1512, 31, { rank: 1 });
    expect(line).toContain("Follow-up Chat");
    expect(line).toContain("1512 ms (31%)");
    expect(line).toContain("[#1]");
  });
});

describe("formatTimelineSeconds", () => {
  it("formats milliseconds as seconds", () => {
    expect(formatTimelineSeconds(4844)).toBe("4.84s");
    expect(formatLatencyShort(5310)).toBe("5.3s");
  });
});

describe("shortSlowestLabel", () => {
  it("shortens labels for compact summary", () => {
    expect(shortSlowestLabel("Follow-up Chat")).toBe("Follow-up");
    expect(shortSlowestLabel("Router")).toBe("Router");
  });
});
