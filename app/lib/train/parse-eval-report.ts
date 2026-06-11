/** Parse router-eval-report-*.md from layer-router-train-v1 data/result. */

export type EvalFailure = {
  source: string;
  expected: string;
  actual: string;
  question: string;
};

export type EvalRouteRow = {
  route: string;
  rows: number;
  pct: number;
};

export type ParsedEvalReport = {
  modelId: string;
  promptVersion: string;
  generatedAt: string;
  total: number;
  correct: number;
  incorrect: number;
  accuracyPct: number;
  failures: EvalFailure[];
  routeRows: EvalRouteRow[];
};

const SUITE_ROUTE: Record<string, string> = {
  router_capabilities: "capabilities",
  router_greeting: "greeting",
  router_help: "help",
  router_identity: "identity",
  router_reject: "reject",
  router_rag_private_kb: "rag_private_kb",
  router_github: "github_search",
  router_web_search: "web_search",
};

function pick(md: string, re: RegExp): string {
  return md.match(re)?.[1]?.trim() ?? "";
}

function parseSummaryTable(md: string): { total: number; correct: number; incorrect: number; accuracyPct: number } {
  const total = Number(pick(md, /Total rows\s*\|\s*(\d+)/));
  const correct = Number(pick(md, /`route_match`\s*=\s*true\s*\|\s*(\d+)/));
  const incorrect = Number(pick(md, /`route_match`\s*=\s*false\s*\|\s*(\d+)/));
  const accRaw = pick(md, /Match rate.*?\*\*([\d.]+)%\*\*/);
  const accuracyPct = accRaw ? Number(accRaw) : total ? (100 * correct) / (correct + incorrect) : 0;
  return { total, correct, incorrect, accuracyPct };
}

function parsePerFile(md: string): EvalRouteRow[] {
  const section = md.split("## Per file")[1]?.split("##")[0] ?? "";
  const rows: EvalRouteRow[] = [];
  for (const line of section.split("\n")) {
    if (!line.startsWith("| `router_")) continue;
    const m = line.match(/\|\s*`(router_[^`]+)\.csv`\s*\|\s*(\d+)/);
    if (!m) continue;
    const stem = m[1]!;
    const count = Number(m[2]);
    const route = SUITE_ROUTE[stem] ?? stem.replace(/^router_/, "");
    rows.push({ route, rows: count, pct: 0 });
  }
  const sum = rows.reduce((a, r) => a + r.rows, 0);
  return rows.map((r) => ({ ...r, pct: sum ? (100 * r.rows) / sum : 0 }));
}

function parseFailures(md: string): EvalFailure[] {
  const section = md.split("## Bad items")[1] ?? "";
  const failures: EvalFailure[] = [];
  for (const line of section.split("\n")) {
    if (!line.startsWith("| `router_")) continue;
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 5) continue;
    failures.push({
      source: parts[1]!.replace(/`/g, ""),
      expected: parts[2]!,
      actual: parts[3]!,
      question: parts[4]!,
    });
  }
  return failures;
}

export function parseEvalReportMarkdown(md: string, modelId: string): ParsedEvalReport {
  const promptVersion = pick(md, /Router prompt version:\*\*\s*`([^`]+)`/);
  const generatedAt = pick(md, /Generated \(UTC\):\*\*\s*([^\n]+)/);
  const routerModel = pick(md, /Router model:\*\*\s*`([^`]+)`/);
  const summary = parseSummaryTable(md);
  return {
    modelId: routerModel || modelId,
    promptVersion,
    generatedAt,
    ...summary,
    failures: parseFailures(md),
    routeRows: parsePerFile(md),
  };
}
