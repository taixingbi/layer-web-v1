import { describe, expect, it } from "vitest";

import {
  isBlockMarkdownSegment,
  isCitationMarker,
  splitAssistantMarkdownParts,
} from "@/lib/assistant-markdown-parts";

describe("splitAssistantMarkdownParts", () => {
  it("splits numeric citation markers from prose", () => {
    expect(splitAssistantMarkdownParts("Gateway API[1] routes requests.")).toEqual([
      "Gateway API",
      "[1]",
      " routes requests.",
    ]);
  });

  it("does not split markdown links", () => {
    const link = "[Building an AI Orchestrator](https://example.com/blog)";
    expect(splitAssistantMarkdownParts(link)).toEqual([link]);
  });
});

describe("isCitationMarker", () => {
  it("matches [n] only", () => {
    expect(isCitationMarker("[1]")).toBe(true);
    expect(isCitationMarker("[12]")).toBe(true);
    expect(isCitationMarker("[text]")).toBe(false);
  });
});

describe("isBlockMarkdownSegment", () => {
  it("detects headings and multi-paragraph content", () => {
    expect(isBlockMarkdownSegment("Gateway API[1]")).toBe(false);
    expect(isBlockMarkdownSegment("# HuntAI Gateway Design")).toBe(true);
    expect(isBlockMarkdownSegment("Line one\n\nLine two")).toBe(true);
    expect(isBlockMarkdownSegment("- Web Application")).toBe(true);
  });
});
