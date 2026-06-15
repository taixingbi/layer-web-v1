import { describe, expect, it } from "vitest";

import { RECRUITER_STARTER_CARDS } from "./chat-starter-cards";

describe("RECRUITER_STARTER_CARDS", () => {
  it("leads with work authorization for recruiter intent", () => {
    expect(RECRUITER_STARTER_CARDS[0]?.id).toBe("work-authorization");
    expect(RECRUITER_STARTER_CARDS[0]?.prompt).toMatch(/visa sponsorship/i);
  });

  it("includes resume download after work authorization", () => {
    expect(RECRUITER_STARTER_CARDS[1]?.id).toBe("resume-download");
    expect(RECRUITER_STARTER_CARDS[1]?.prompt).toMatch(/download.*resume/i);
  });

  it("has five distinct cards with prompts", () => {
    expect(RECRUITER_STARTER_CARDS).toHaveLength(5);
    const ids = RECRUITER_STARTER_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(4);
    for (const card of RECRUITER_STARTER_CARDS) {
      expect(card.title.trim()).not.toBe("");
      expect(card.prompt.trim()).not.toBe("");
    }
  });
});
