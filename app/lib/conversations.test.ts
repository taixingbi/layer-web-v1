import { describe, expect, it } from "vitest";

import {
  conversationLabel,
  storedMessagesToChatTurns,
} from "@/lib/conversations";

describe("conversationLabel", () => {
  it("uses title when present", () => {
    expect(
      conversationLabel({ id: "1", title: "Hello world", created_at: null, updated_at: null }),
    ).toBe("Hello world");
  });

  it("truncates long titles", () => {
    const long = "a".repeat(60);
    expect(
      conversationLabel({ id: "1", title: long, created_at: null, updated_at: null }).length,
    ).toBeLessThanOrEqual(49);
  });
});

describe("storedMessagesToChatTurns", () => {
  it("maps roles and skips empty content", () => {
    const turns = storedMessagesToChatTurns([
      { id: 1, role: "user", content: "Hi" },
      { id: 2, role: "assistant", content: "Hey" },
      { id: 3, role: "system", content: "ignored" },
      { id: 4, role: "user", content: "   " },
    ]);
    expect(turns).toHaveLength(2);
    expect(turns[0]?.role).toBe("user");
    expect(turns[1]?.id).toBe("db-2");
  });
});
