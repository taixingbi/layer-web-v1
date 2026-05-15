import { describe, expect, it } from "vitest";
import { buildHistory, truncateBeforeMessageId } from "./chat-history";

describe("buildHistory", () => {
  it("maps roles and content only", () => {
    const history = buildHistory([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ]);
    expect(history).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ]);
  });

  it("skips empty content", () => {
    expect(
      buildHistory([
        { role: "user", content: "   " },
        { role: "assistant", content: "Answer" },
      ])
    ).toEqual([{ role: "assistant", content: "Answer" }]);
  });
});

describe("truncateBeforeMessageId", () => {
  const msgs = [
    { id: "u1", role: "user" as const, content: "A" },
    { id: "a1", role: "assistant" as const, content: "B" },
    { id: "u2", role: "user" as const, content: "C" },
    { id: "a2", role: "assistant" as const, content: "D" },
  ];

  it("keeps messages before the target id", () => {
    expect(truncateBeforeMessageId(msgs, "u2")).toEqual(msgs.slice(0, 2));
  });

  it("returns original array when id is missing", () => {
    expect(truncateBeforeMessageId(msgs, "missing")).toEqual(msgs);
  });
});
