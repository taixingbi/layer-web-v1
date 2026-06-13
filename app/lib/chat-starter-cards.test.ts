import { describe, expect, it } from "vitest";

import { RECRUITER_STARTER_CARDS } from "./chat-starter-cards";

describe("RECRUITER_STARTER_CARDS", () => {
  it("leads with work authorization for recruiter intent", () => {
    expect(RECRUITER_STARTER_CARDS[0]?.id).toBe("work-authorization");
    expect(RECRUITER_STARTER_CARDS[0]?.prompt).toMatch(/visa sponsorship/i);
  });

  it("has four distinct cards with prompts", () => {
    expect(RECRUITER_STARTER_CARDS).toHaveLength(4);
    const ids = RECRUITER_STARTER_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(4);
    for (const card of RECRUITER_STARTER_CARDS) {
      expect(card.title.trim()).not.toBe("");
      expect(card.prompt.trim()).not.toBe("");
    }
  });
});
