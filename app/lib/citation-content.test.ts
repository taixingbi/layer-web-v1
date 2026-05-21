import { describe, expect, it } from "vitest";
import { normalizeCitationSpacing } from "./citation-content";

describe("normalizeCitationSpacing", () => {
  it("removes space before citation markers and before punctuation", () => {
    expect(normalizeCitationSpacing("H4 EAD. [1] .")).toBe("H4 EAD.[1].");
    expect(normalizeCitationSpacing("status is H4 EAD [1]")).toBe("status is H4 EAD[1]");
  });
});
