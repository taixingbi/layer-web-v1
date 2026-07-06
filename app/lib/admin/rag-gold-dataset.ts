/**
 * RAG gold dataset catalog from GitHub (layer-rag-evaluation-v1) + last-run metadata.
 */

import type { AdminGoldDatasetCatalog, AdminGoldDatasetFile } from "@/lib/admin/types";

const REPO = "taixingbi/layer-rag-evaluation-v1";
const BRANCH = "main";

const FILE_META: Record<string, { label: string; description: string; bucket: string }> = {
  easy_single_hop: {
    label: "Easy single-hop",
    description: "Direct fact lookup from one chunk",
    bucket: "easy_single_hop",
  },
  multi_hop: {
    label: "Multi-hop",
    description: "Questions requiring chained retrieval",
    bucket: "multi_hop",
  },
  paraphrase: {
    label: "Paraphrase",
    description: "Reworded queries against same gold answers",
    bucket: "paraphrase",
  },
  nagative: {
    label: "Negative",
    description: "Out-of-scope or should-not-answer cases",
    bucket: "negative",
  },
  gold_dataset: {
    label: "Full dataset",
    description: "Consolidated gold JSONL for regression",
    bucket: "full",
  },
};

type GithubContentEntry = {
  name?: string;
  path?: string;
  size?: number;
  html_url?: string;
  download_url?: string;
};

type RunMetaFile = {
  path?: string;
  sha256?: string;
  bytes?: number;
};

function envDataDir(env: string): string {
  return env.trim().toLowerCase() === "prod" ? "data_prod" : "data_dev";
}

/** GitHub tree URL for ``data_<env>/gold_dataset``. */
export function goldDatasetRepoUrl(env: string): string {
  return `https://github.com/${REPO}/tree/${BRANCH}/${envDataDir(env)}/gold_dataset`;
}

/** GitHub blob URL for a gold JSONL file. */
export function goldFileBlobUrl(env: string, filename: string): string {
  return `https://github.com/${REPO}/blob/${BRANCH}/${envDataDir(env)}/gold_dataset/${filename}`;
}

/** Raw.githubusercontent.com URL for a gold JSONL file. */
export function goldFileRawUrl(env: string, filename: string): string {
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${envDataDir(env)}/gold_dataset/${filename}`;
}

/** In-app admin viewer path for a gold JSONL file. */
export function goldDatasetViewerUrl(env: string, filename: string): string {
  const envKey = env.trim().toLowerCase() === "prod" ? "prod" : "dev";
  return `/admin/rag-gold?env=${encodeURIComponent(envKey)}&file=${encodeURIComponent(filename)}`;
}

function basename(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] ?? path;
}

function fileStem(filename: string): string {
  return filename.replace(/\.jsonl$/i, "");
}

/** Human label + description for a gold JSONL filename. */
export function goldFileMeta(filename: string): {
  label: string;
  description: string;
  bucket: string;
} {
  const stem = fileStem(filename);
  return (
    FILE_META[stem] ?? {
      label: stem.replace(/_/g, " "),
      description: "Gold eval JSONL",
      bucket: stem,
    }
  );
}

function parseRunMetaFiles(runMeta: Record<string, unknown> | null | undefined): Map<string, RunMetaFile> {
  const out = new Map<string, RunMetaFile>();
  const raw = runMeta?.gold_dataset_files;
  if (!Array.isArray(raw)) return out;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as RunMetaFile;
    const name = row.path ? basename(row.path) : "";
    if (name) out.set(name, row);
  }
  return out;
}

function parseRunMetaGoldPaths(runMeta: Record<string, unknown> | null | undefined): Set<string> {
  const out = new Set<string>();
  const raw = runMeta?.gold_paths;
  if (!Array.isArray(raw)) return out;
  for (const p of raw) {
    if (typeof p === "string" && p.trim()) out.add(basename(p.trim()));
  }
  return out;
}

function formatBytes(bytes: number | null): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function countJsonlRows(rawUrl: string): Promise<number | null> {
  try {
    const res = await fetch(rawUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
      headers: { Accept: "text/plain" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    let count = 0;
    for (const line of text.split("\n")) {
      if (line.trim()) count += 1;
    }
    return count;
  } catch {
    return null;
  }
}

async function fetchGithubCatalog(env: string): Promise<GithubContentEntry[]> {
  const dir = `${envDataDir(env)}/gold_dataset`;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${dir}?ref=${BRANCH}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "huntai-admin-dashboard",
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as GithubContentEntry[] | GithubContentEntry;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function buildFileEntry(
  env: string,
  name: string,
  opts: {
    bytes: number | null;
    rows: number | null;
    sha256: string | null;
    url: string;
    usedInLastRun: boolean;
  },
): AdminGoldDatasetFile {
  const meta = goldFileMeta(name);
  return {
    name,
    label: meta.label,
    description: meta.description,
    bucket: meta.bucket,
    bytes: opts.bytes,
    rows: opts.rows,
    url: opts.url,
    sha256: opts.sha256,
    usedInLastRun: opts.usedInLastRun,
  };
}

/** Load gold JSONL catalog for an eval env, enriched with last-run metadata when present. */
export async function fetchGoldDatasetCatalog(
  env: string,
  runMeta?: Record<string, unknown> | null,
): Promise<AdminGoldDatasetCatalog> {
  const envKey = env.trim().toLowerCase() || "dev";
  const repoUrl = goldDatasetRepoUrl(envKey);
  const runFiles = parseRunMetaFiles(runMeta ?? null);
  const usedPaths = parseRunMetaGoldPaths(runMeta ?? null);

  const githubEntries = await fetchGithubCatalog(envKey);
  const jsonlEntries = githubEntries.filter((e) => e.name?.endsWith(".jsonl"));

  if (jsonlEntries.length === 0 && runFiles.size === 0) {
    return {
      source: "unavailable",
      env: envKey,
      repoUrl,
      files: [],
      totalBytes: null,
      totalRows: null,
    };
  }

  const names = new Set<string>();
  for (const e of jsonlEntries) {
    if (e.name) names.add(e.name);
  }
  for (const name of runFiles.keys()) names.add(name);

  const rowCounts = await Promise.all(
    [...names].map(async (name) => ({
      name,
      rows: await countJsonlRows(goldFileRawUrl(envKey, name)),
    })),
  );
  const rowsByName = new Map(rowCounts.map((r) => [r.name, r.rows]));

  const files: AdminGoldDatasetFile[] = [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const gh = jsonlEntries.find((e) => e.name === name);
      const run = runFiles.get(name);
      const usedInLastRun = usedPaths.has(name) || (usedPaths.size === 0 && runFiles.has(name));
      return buildFileEntry(envKey, name, {
        bytes: run?.bytes ?? gh?.size ?? null,
        rows: rowsByName.get(name) ?? null,
        sha256: run?.sha256 ?? null,
        url: gh?.html_url ?? goldFileBlobUrl(envKey, name),
        usedInLastRun,
      });
    });

  const totalBytes = files.reduce((sum, f) => sum + (f.bytes ?? 0), 0) || null;
  const totalRows = files.reduce((sum, f) => sum + (f.rows ?? 0), 0) || null;

  return {
    source: jsonlEntries.length > 0 ? "github" : "run_meta",
    env: envKey,
    repoUrl,
    files,
    totalBytes: totalBytes && totalBytes > 0 ? totalBytes : null,
    totalRows: totalRows && totalRows > 0 ? totalRows : null,
  };
}

export { formatBytes as formatGoldFileBytes };
