import { describe, expect, it } from "vitest";
import { chatUsageToolKey, timelineHoverKind } from "./timeline-hover";

describe("timelineHoverKind", () => {
  it("maps router, rag tool, embed, and chat rows", () => {
    expect(timelineHoverKind("intent-router", "Router")).toBe("router");
    expect(timelineHoverKind("rag_private_kb", "Tool Rag Private KB")).toBe("rag_tool");
    expect(timelineHoverKind("rag_private_kb-retrieval-embed", "Query embedding")).toBe("embed");
    expect(timelineHoverKind("rag_private_kb-generation-answer", "RAG answer generation")).toBe(
      "chat",
    );
  });

  it("ignores follow-up and unlabeled phases", () => {
    expect(timelineHoverKind("rag_private_kb-generation-follow_up", "Follow-up Chat")).toBeNull();
    expect(timelineHoverKind("rag_private_kb-retrieval-rerank", "Rerank")).toBeNull();
  });
});

describe("chatUsageToolKey", () => {
  it("selects tool usage bucket from node id", () => {
    expect(chatUsageToolKey("rag_private_kb-service-chat")).toBe("tool_rag");
    expect(chatUsageToolKey("github-search-chat")).toBe("tool_github_search");
  });
});
