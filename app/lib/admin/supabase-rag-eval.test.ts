import { describe, expect, it } from "vitest";

import {
  emptyRagEvalMetrics,
  mapRagEvalRunRow,
} from "@/lib/admin/supabase-rag-eval";

describe("mapRagEvalRunRow", () => {
  it("maps rag_eval_runs row to dashboard metrics", () => {
    const out = mapRagEvalRunRow({
      id: "run-abc",
      created_at: "2026-06-01T12:00:00Z",
      env: "prod",
      collection_base: "taixing_knowledge",
      rows_loaded: 25,
      rows_evaluated: 20,
      pass: true,
      mrr_rerank: 0.77,
      recall_at_5_rerank: 0.85,
      ndcg_at_5_rerank: 0.81,
      llm_judge_score_mean: 0.73,
      latency_ms_p50: 1975,
      latency_ms_p95: 2751,
      gold_dataset_sha256: "abcdef1234567890",
      git_sha: "deadbeef",
      eval_package_version: "1.2.0",
      notes: null,
    });
    expect(out).toMatchObject({
      source: "supabase",
      env: "prod",
      collectionBase: "taixing_knowledge",
      runId: "run-abc",
      rowsEvaluated: 20,
      pass: true,
      mrrRerank: 0.77,
      recallAt5Rerank: 0.85,
      latencyMsP50: 1975,
      goldDatasetSha256: "abcdef1234567890",
    });
  });

  it("coerces numeric strings from PostgREST", () => {
    const out = mapRagEvalRunRow({
      id: "x",
      env: "dev",
      mrr_rerank: "0.5",
      latency_ms_p50: "1200",
      pass: false,
    });
    expect(out.mrrRerank).toBe(0.5);
    expect(out.latencyMsP50).toBe(1200);
    expect(out.pass).toBe(false);
  });
});

describe("emptyRagEvalMetrics", () => {
  it("returns unavailable shell for env", () => {
    const out = emptyRagEvalMetrics("prod");
    expect(out.source).toBe("unavailable");
    expect(out.env).toBe("prod");
    expect(out.runId).toBeNull();
    expect(out.goldDataset.env).toBe("prod");
    expect(out.goldDataset.repoUrl).toContain("data_prod");
  });
});
