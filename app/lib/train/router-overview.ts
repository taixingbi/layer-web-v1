import type { ParsedEvalReport } from "@/lib/train/parse-eval-report";
import { parseEvalReportMarkdown } from "@/lib/train/parse-eval-report";
import { snapshotEvalReports } from "@/lib/train/router-eval-snapshot";
import {
  ROUTER_DEFAULT_BASE_MODEL,
  ROUTER_DEFAULT_PROMPT_VERSION,
  ROUTER_DPO_LORA_ID,
  ROUTER_PRODUCTION_MODEL,
  ROUTER_SFT_LORA_ID,
  ROUTER_TRAIN_REPOS,
} from "@/lib/train/router-constants";

export type DatasetStats = {
  trainRows: number;
  valRows: number;
  byRoute: Record<string, number>;
  dpoPairs?: number;
  rejectedSource?: Record<string, number>;
};

export type RouterOverviewPayload = {
  production: {
    modelId: string;
    accuracyPct: number;
    promptVersion: string;
    lastEvalAt: string;
    goldCases: number;
    failed: number;
    vsBasePct: number;
  };
  deployment: {
    baseModel: string;
    adapter: string;
    prompt: string;
    status: string;
    trafficSplit: Array<{ modelId: string; label: string; pct: number }>;
  };
  accuracyTrend: Array<{ modelId: string; label: string; accuracyPct: number }>;
  evals: {
    base: ParsedEvalReport;
    sft: ParsedEvalReport;
    dpo: ParsedEvalReport;
  };
  datasets: {
    sft: DatasetStats;
    dpo: DatasetStats;
  };
  resultTreeUrl: string;
  source: "github" | "snapshot";
};

const GITHUB_RAW =
  "https://raw.githubusercontent.com/taixingbi/layer-router-train-v1/main";

const REPORT_PATHS = {
  base: "data/result/base/router-eval-report-router-v2.00.md",
  sft: `data/result/${ROUTER_SFT_LORA_ID}/router-eval-report-router-v2.00-${ROUTER_SFT_LORA_ID}.md`,
  dpo: `data/result/${ROUTER_DPO_LORA_ID}/router-eval-report-router-v2.00-${ROUTER_DPO_LORA_ID}.md`,
} as const;

async function fetchText(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_RAW}/${path}`, {
      headers: { "User-Agent": "huntai-web-train" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const text = await fetchText(path);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

type BuildStats = {
  rows_total?: number;
  examples_written?: number;
  pairs_written?: number;
  by_expected_route?: Record<string, number>;
  rejected_source?: Record<string, number>;
};

async function loadEval(
  key: keyof typeof REPORT_PATHS,
  fallback: ParsedEvalReport,
  onHit: () => void,
): Promise<ParsedEvalReport> {
  const md = await fetchText(REPORT_PATHS[key]);
  if (!md) return fallback;
  onHit();
  const modelId = key === "base" ? "base" : key === "sft" ? ROUTER_SFT_LORA_ID : ROUTER_DPO_LORA_ID;
  return parseEvalReportMarkdown(md, modelId);
}

function datasetFromBuild(stats: BuildStats | null, isDpo: boolean): DatasetStats {
  const written = isDpo ? (stats?.pairs_written ?? 0) : (stats?.examples_written ?? 0);
  const total = stats?.rows_total ?? written;
  const val = Math.max(0, total - written);
  return {
    trainRows: written,
    valRows: val,
    byRoute: stats?.by_expected_route ?? {},
    ...(isDpo
      ? { dpoPairs: stats?.pairs_written ?? 0, rejectedSource: stats?.rejected_source ?? {} }
      : {}),
  };
}

export async function buildRouterOverview(): Promise<RouterOverviewPayload> {
  const snap = snapshotEvalReports();
  let githubHits = 0;
  const hit = () => {
    githubHits += 1;
  };
  const [base, sft, dpo, sftStats, dpoStats] = await Promise.all([
    loadEval("base", snap.base, hit),
    loadEval("sft", snap.sft, hit),
    loadEval("dpo", snap.dpo, hit),
    fetchJson<BuildStats>("data/output/sft/build-stats.json"),
    fetchJson<BuildStats>("data/output/dpo/build-stats.json"),
  ]);

  const prod = ROUTER_PRODUCTION_MODEL === ROUTER_SFT_LORA_ID ? sft : dpo;

  return {
    production: {
      modelId: ROUTER_PRODUCTION_MODEL,
      accuracyPct: prod.accuracyPct,
      promptVersion: prod.promptVersion || ROUTER_DEFAULT_PROMPT_VERSION,
      lastEvalAt: prod.generatedAt,
      goldCases: prod.total,
      failed: prod.incorrect,
      vsBasePct: Number((prod.accuracyPct - base.accuracyPct).toFixed(1)),
    },
    deployment: {
      baseModel: ROUTER_DEFAULT_BASE_MODEL,
      adapter: ROUTER_PRODUCTION_MODEL,
      prompt: ROUTER_DEFAULT_PROMPT_VERSION,
      status: "Production",
      trafficSplit: [
        { modelId: ROUTER_SFT_LORA_ID, label: "SFT (prod)", pct: 90 },
        { modelId: ROUTER_DPO_LORA_ID, label: "DPO (canary)", pct: 10 },
      ],
    },
    accuracyTrend: [
      { modelId: "base", label: "Base", accuracyPct: base.accuracyPct },
      { modelId: ROUTER_SFT_LORA_ID, label: "SFT v1.00", accuracyPct: sft.accuracyPct },
      { modelId: ROUTER_DPO_LORA_ID, label: "DPO v1.00", accuracyPct: dpo.accuracyPct },
    ],
    evals: { base, sft, dpo },
    datasets: {
      sft: datasetFromBuild(sftStats, false),
      dpo: datasetFromBuild(dpoStats, true),
    },
    resultTreeUrl: `${ROUTER_TRAIN_REPOS.train}/tree/main/data/result`,
    source: githubHits > 0 ? "github" : "snapshot",
  };
}
