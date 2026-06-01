import { describe, expect, it } from "vitest";
import { timelineNodeRepoName, timelineNodeRepoUrl } from "./latency-timeline-repos";

describe("timelineNodeRepoUrl", () => {
  it("maps pipeline layers to taixingbi repos", () => {
    expect(timelineNodeRepoUrl("client")).toBe("https://github.com/taixingbi/layer-web-v1");
    expect(timelineNodeRepoUrl("bff")).toBe("https://github.com/taixingbi/layer-web-v1");
    expect(timelineNodeRepoUrl("gateway")).toBe(
      "https://github.com/taixingbi/layer-gateway-api-v1",
    );
    expect(timelineNodeRepoUrl("storage-write-user")).toBe(
      "https://github.com/taixingbi/layer-gateway-api-v1",
    );
    expect(timelineNodeRepoUrl("orchestrator")).toBe(
      "https://github.com/taixingbi/layer-orchestrator-v1",
    );
    expect(timelineNodeRepoUrl("intent-router")).toBe(
      "https://github.com/taixingbi/layer-orchestrator-v1",
    );
    expect(timelineNodeRepoUrl("rag-generation-follow_up")).toBe(
      "https://github.com/taixingbi/layer-rag-query-v1",
    );
    expect(timelineNodeRepoUrl("rag-retrieval-embed")).toBe(
      "https://github.com/taixingbi/layer-gateway-embed-v1",
    );
    expect(timelineNodeRepoUrl("rag-service-chunk_rerank")).toBe(
      "https://github.com/taixingbi/layer-gateway-reranker-v1",
    );
  });

  it("exposes repo slug for tooltips", () => {
    expect(timelineNodeRepoName("gateway")).toBe("layer-gateway-api-v1");
  });
});
