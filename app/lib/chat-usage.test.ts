import { describe, expect, it } from "vitest";
import { formatTokenLine, parseUsageRows } from "./chat-usage";

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
