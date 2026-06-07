import { describe, expect, it } from "vitest";
import { formatTokenLine, parseUsageRows, phaseUsageSlice, tokenCount, estimateUsageCostUsd, formatUsageCost } from "./chat-usage";

describe("phaseUsageSlice", () => {
  it("reads tool phase tokens", () => {
    const usage = {
      tool_rag: {
        chat: { prompt_tokens: 328, completion_tokens: 25, total_tokens: 353 },
      },
    };
    expect(phaseUsageSlice(usage, "tool_rag", "chat")).toEqual({
      prompt_tokens: 328,
      completion_tokens: 25,
      total_tokens: 353,
    });
    expect(phaseUsageSlice(usage, "tool_rag", "follow_up_chat")).toBeNull();
  });
});

describe("tokenCount", () => {
  it("reads total_tokens when present", () => {
    expect(tokenCount({ total_tokens: 576 })).toBe(576);
  });
});

describe("estimateUsageCostUsd", () => {
  it("estimates small request cost", () => {
    expect(formatUsageCost(estimateUsageCostUsd({ total_tokens: 576 }))).toBe("$0.0002");
  });
});

describe("parseUsageRows", () => {
  it("flattens nested gateway usage", () => {
    const rows = parseUsageRows({
      intent_router: { prompt_tokens: 220, completion_tokens: 18, total_tokens: 238 },
      tool_rag: {
        chat: { prompt_tokens: 1050, completion_tokens: 42, total_tokens: 1092 },
        follow_up_chat: { prompt_tokens: 273, completion_tokens: 86, total_tokens: 359 },
      },
    });
    expect(rows.some((r) => r.label === "Router")).toBe(true);
    expect(rows.some((r) => r.label.includes("Chat"))).toBe(true);
    expect(formatTokenLine(rows[0]!.usage)).toContain("prompt");
  });
});
