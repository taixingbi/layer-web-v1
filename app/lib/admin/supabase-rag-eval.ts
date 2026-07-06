/**
 * Latest RAG gold eval run from Supabase ``rag_eval_runs``.
 */

import { adminConfig } from "@/lib/admin/config";
import { supabaseGet, type SupabaseRow } from "@/lib/admin/supabase-rest";
import type { AdminRagEvalMetrics } from "@/lib/admin/types";

const RAG_EVAL_SELECT =
  "id,created_at,env,collection_base,rows_loaded,rows_evaluated,pass," +
  "mrr_rerank,recall_at_5_rerank,ndcg_at_5_rerank,llm_judge_score_mean," +
  "latency_ms_p50,latency_ms_p95,gold_dataset_sha256,git_sha,eval_package_version,notes";

function floatField(row: SupabaseRow, key: string): number | null {
  const v = row[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function intField(row: SupabaseRow, key: string): number | null {
  const n = floatField(row, key);
  return n != null ? Math.round(n) : null;
}

function strField(row: SupabaseRow, key: string): string | null {
  const v = row[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Map a ``rag_eval_runs`` row to dashboard metrics. */
export function mapRagEvalRunRow(row: SupabaseRow): AdminRagEvalMetrics {
  const pass = row.pass;
  return {
    source: "supabase",
    env: strField(row, "env") ?? adminConfig.ragEvalEnv,
    collectionBase: strField(row, "collection_base"),
    runId: strField(row, "id"),
    evaluatedAt: strField(row, "created_at"),
    rowsEvaluated: intField(row, "rows_evaluated"),
    rowsLoaded: intField(row, "rows_loaded"),
    pass: typeof pass === "boolean" ? pass : null,
    mrrRerank: floatField(row, "mrr_rerank"),
    recallAt5Rerank: floatField(row, "recall_at_5_rerank"),
    ndcgAt5Rerank: floatField(row, "ndcg_at_5_rerank"),
    llmJudgeScoreMean: floatField(row, "llm_judge_score_mean"),
    latencyMsP50: floatField(row, "latency_ms_p50"),
    latencyMsP95: floatField(row, "latency_ms_p95"),
    goldDatasetSha256: strField(row, "gold_dataset_sha256"),
    gitSha: strField(row, "git_sha"),
    evalPackageVersion: strField(row, "eval_package_version"),
    notes: strField(row, "notes"),
  };
}

export const emptyRagEvalMetrics = (env: string): AdminRagEvalMetrics => ({
  source: "unavailable",
  env,
  collectionBase: null,
  runId: null,
  evaluatedAt: null,
  rowsEvaluated: null,
  rowsLoaded: null,
  pass: null,
  mrrRerank: null,
  recallAt5Rerank: null,
  ndcgAt5Rerank: null,
  llmJudgeScoreMean: null,
  latencyMsP50: null,
  latencyMsP95: null,
  goldDatasetSha256: null,
  gitSha: null,
  evalPackageVersion: null,
  notes: null,
});

/** Fetch the most recent eval run for ``env`` (dev / prod). */
export async function fetchLatestRagEvalRun(
  env: string = adminConfig.ragEvalEnv,
): Promise<AdminRagEvalMetrics> {
  if (!adminConfig.supabaseUrl || !adminConfig.supabaseServiceKey) {
    return emptyRagEvalMetrics(env);
  }

  const envParam = encodeURIComponent(env.trim() || "dev");
  const rows = await supabaseGet(
    `rag_eval_runs?env=eq.${envParam}&order=created_at.desc&limit=1&select=${RAG_EVAL_SELECT}`,
  );
  if (!rows?.length) {
    return emptyRagEvalMetrics(env);
  }
  return mapRagEvalRunRow(rows[0]!);
}
