import { describe, expect, it } from "vitest";
import { patchStreamingMessage } from "./chat-stream-patch";

describe("patchStreamingMessage", () => {
  it("updates only the streaming assistant row", () => {
    const messages = [
      { id: "u1", role: "user" as const, content: "hi" },
      { id: "a1", role: "assistant" as const, content: "" },
    ];
    const next = patchStreamingMessage(messages, "a1", { content: "Hello" });
    expect(next[1]?.content).toBe("Hello");
    expect(next[0]?.content).toBe("hi");
  });
});
