import { describe, expect, it } from "vitest";

import { assistantMessageLayout } from "@/lib/chat-assistant-layout";

describe("assistantMessageLayout", () => {
  it("shows thinking after rewrite until answer tokens arrive", () => {
    const flags = assistantMessageLayout(
      { content: "", rewrite: "architecture design", route: "github_search" },
      true,
    );
    expect(flags.showThinking).toBe(true);
    expect(flags.showAnswer).toBe(false);
    expect(flags.showDetails).toBe(false);
  });

  it("hides details when route exists but answer is still empty", () => {
    const flags = assistantMessageLayout(
      {
        content: "",
        route: "github_search",
        route_detail: { name: "github_search", confidence: 0.9 },
      },
      true,
    );
    expect(flags.showDetails).toBe(false);
  });

  it("shows answer and details once content exists", () => {
    const flags = assistantMessageLayout(
      {
        content: "# HuntAI Architecture",
        route: "github_search",
        citations: [{ source: "README" }],
      },
      false,
    );
    expect(flags.showThinking).toBe(false);
    expect(flags.showAnswer).toBe(true);
    expect(flags.showDetails).toBe(true);
    expect(flags.showFollowUps).toBe(false);
  });

  it("shows follow-ups only after answer content", () => {
    const withFollowUps = assistantMessageLayout(
      {
        content: "",
        follow_up_questions: ["What is the gateway?"],
        route: "rag_private_kb",
      },
      true,
    );
    expect(withFollowUps.showFollowUps).toBe(false);

    const ready = assistantMessageLayout(
      {
        content: "Answer text",
        follow_up_questions: ["What is the gateway?"],
      },
      false,
    );
    expect(ready.showFollowUps).toBe(true);
  });
});
