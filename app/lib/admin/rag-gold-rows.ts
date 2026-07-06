/**
 * Parse and fetch RAG gold eval JSONL rows from GitHub.
 */

import { goldFileBlobUrl, goldFileMeta, goldFileRawUrl } from "@/lib/admin/rag-gold-dataset";

export type GoldEvalEnv = "dev" | "prod";

export type AdminGoldRow = {
  id: string | null;
  question: string;
  answer: string | null;
  expectedBehavior: string | null;
  evalBucket: string | null;
  mustContain: string[];
  source: string | null;
  docType: string | null;
  caseType: string | null;
  queryType: string | null;
};

export type AdminGoldRowsResponse = {
  env: GoldEvalEnv;
  file: string;
  label: string;
  githubUrl: string;
  total: number;
  offset: number;
  limit: number;
  rows: AdminGoldRow[];
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** Normalize ``dev`` / ``prod`` env param. */
export function normalizeGoldEvalEnv(value: string | null | undefined): GoldEvalEnv | null {
  const key = (value ?? "").trim().toLowerCase();
  if (key === "dev" || key === "prod") return key;
  return null;
}

/** Safe gold JSONL basename (no path segments). */
export function normalizeGoldFilename(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw || raw.includes("/") || raw.includes("\\") || raw.includes("..")) return null;
  if (!raw.toLowerCase().endsWith(".jsonl")) return null;
  if (!/^[a-zA-Z0-9_.-]+\.jsonl$/.test(raw)) return null;
  return raw;
}

function strField(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function mustContainField(obj: Record<string, unknown>): string[] {
  const raw = obj.must_contain;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

/** Parse one gold JSONL line into a table row. */
export function parseGoldJsonlLine(line: string, lineNo: number): AdminGoldRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let obj: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    obj = parsed as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid JSON on line ${lineNo}`);
  }
  const question = strField(obj, "question");
  if (!question) return null;
  return {
    id: strField(obj, "id"),
    question,
    answer: strField(obj, "answer"),
    expectedBehavior: strField(obj, "expected_behavior"),
    evalBucket: strField(obj, "eval_bucket"),
    mustContain: mustContainField(obj),
    source: strField(obj, "source"),
    docType: strField(obj, "doc_type"),
    caseType: strField(obj, "case_type"),
    queryType: strField(obj, "query_type"),
  };
}

/** Parse full JSONL text into rows. */
export function parseGoldJsonlText(text: string): AdminGoldRow[] {
  const rows: AdminGoldRow[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const row = parseGoldJsonlLine(lines[i]!, i + 1);
    if (row) rows.push(row);
  }
  return rows;
}

function rowMatchesQuery(row: AdminGoldRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (row.question.toLowerCase().includes(q)) return true;
  if (row.answer?.toLowerCase().includes(q)) return true;
  if (row.evalBucket?.toLowerCase().includes(q)) return true;
  if (row.mustContain.some((part) => part.toLowerCase().includes(q))) return true;
  return false;
}

export function paginateGoldRows(
  rows: AdminGoldRow[],
  opts: { offset: number; limit: number; query?: string },
): { total: number; rows: AdminGoldRow[] } {
  const filtered = opts.query ? rows.filter((row) => rowMatchesQuery(row, opts.query!)) : rows;
  const offset = Math.max(0, opts.offset);
  const limit = Math.min(MAX_LIMIT, Math.max(1, opts.limit));
  return {
    total: filtered.length,
    rows: filtered.slice(offset, offset + limit),
  };
}

export function parseGoldRowsQueryParams(params: {
  env?: string | null;
  file?: string | null;
  offset?: string | null;
  limit?: string | null;
  q?: string | null;
}):
  | { ok: true; env: GoldEvalEnv; file: string; offset: number; limit: number; query: string }
  | { ok: false; error: string; status: number } {
  const env = normalizeGoldEvalEnv(params.env);
  if (!env) return { ok: false, error: "Invalid env (use dev or prod)", status: 400 };
  const file = normalizeGoldFilename(params.file);
  if (!file) return { ok: false, error: "Invalid file (expected *.jsonl basename)", status: 400 };
  const offsetRaw = params.offset?.trim();
  const offset =
    offsetRaw && /^\d+$/.test(offsetRaw) ? Math.max(0, Number.parseInt(offsetRaw, 10)) : 0;
  const limitRaw = params.limit?.trim();
  const limit =
    limitRaw && /^\d+$/.test(limitRaw)
      ? Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limitRaw, 10)))
      : DEFAULT_LIMIT;
  const query = (params.q ?? "").trim();
  return { ok: true, env, file, offset, limit, query };
}

/** Fetch and paginate gold rows from GitHub raw JSONL. */
export async function fetchGoldRowsPage(params: {
  env: GoldEvalEnv;
  file: string;
  offset: number;
  limit: number;
  query?: string;
}): Promise<AdminGoldRowsResponse> {
  const url = goldFileRawUrl(params.env, params.file);
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "text/plain" },
  });
  if (!res.ok) {
    throw new Error(`GitHub fetch failed (${res.status})`);
  }
  const text = await res.text();
  const allRows = parseGoldJsonlText(text);
  const { total, rows } = paginateGoldRows(allRows, {
    offset: params.offset,
    limit: params.limit,
    query: params.query,
  });
  const meta = goldFileMeta(params.file);
  return {
    env: params.env,
    file: params.file,
    label: meta.label,
    githubUrl: goldFileBlobUrl(params.env, params.file),
    total,
    offset: params.offset,
    limit: params.limit,
    rows,
  };
}

export { DEFAULT_LIMIT as GOLD_ROWS_DEFAULT_LIMIT, MAX_LIMIT as GOLD_ROWS_MAX_LIMIT };
