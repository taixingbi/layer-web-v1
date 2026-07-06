import { describe, expect, it } from "vitest";

import {
  aggregateRagMetricsFromMetaRows,
  isRagMessageMeta,
  percentile50,
  ragLatencySampleFromMeta,
} from "@/lib/admin/supabase-rag-metrics";

describe("isRagMessageMeta", () => {
  it("detects rag_private_kb route", () => {
    expect(isRagMessageMeta({ route: "rag_private_kb" })).toBe(true);
    expect(isRagMessageMeta({ route: "github_search" })).toBe(false);
  });
});

describe("ragLatencySampleFromMeta", () => {
  it("reads tool_rag timings from orchestrator workflow envelope", () => {
    const sample = ragLatencySampleFromMeta({
      route: "rag_private_kb",
      latency_ms: {
        total: 5000,
        orchestrator: {
          proxy_total: 4800,
          workflow: {
            total: 2800,
            tool_rag: {
              embed: 45,
              retrieve: 312,
              rerank: 139,
              total: 1767,
            },
          },
        },
      },
      tool_meta: {
        key: "tool_rag",
        retrieval: { context_chunks: 5 },
      },
    });
    expect(sample).toEqual({
      embedMs: 45,
      retrievalMs: 312,
      rerankMs: 139,
      contextSize: 5,
    });
  });

  it("maps retrieve_rerank to retrieval when retrieve is absent", () => {
    const sample = ragLatencySampleFromMeta({
      route: "rag",
      latency_ms: {
        tool_rag: { embed: 50, retrieve_rerank: 800, total: 900 },
      },
    });
    expect(sample?.embedMs).toBe(50);
    expect(sample?.retrievalMs).toBe(800);
    expect(sample?.rerankMs).toBeNull();
  });
});

describe("aggregateRagMetricsFromMetaRows", () => {
  it("computes p50 across rows", () => {
    const rows = [
      {
        metadata: {
          route: "rag_private_kb",
          latency_ms: { orchestrator: { workflow: { tool_rag: { embed: 40, retrieve: 300 } } } },
        },
      },
      {
        metadata: {
          route: "rag_private_kb",
          latency_ms: { orchestrator: { workflow: { tool_rag: { embed: 60, retrieve: 500 } } } },
        },
      },
    ];
    const out = aggregateRagMetricsFromMetaRows(rows);
    expect(out.embedP50Ms).toBe(50);
    expect(out.retrievalP50Ms).toBe(400);
    expect(out.source).toBe("supabase");
  });
});

describe("percentile50", () => {
  it("returns median", () => {
    expect(percentile50([100, 200, 900])).toBe(200);
    expect(percentile50([100, 200])).toBe(150);
  });
});
