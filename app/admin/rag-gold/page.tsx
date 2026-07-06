"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminGate, AdminShell } from "@/components/admin/AdminShell";
import { authFetch } from "@/lib/auth-fetch";
import type { AdminGoldRowsResponse } from "@/lib/admin/rag-gold-rows";
import { GOLD_ROWS_DEFAULT_LIMIT } from "@/lib/admin/rag-gold-rows";
import { webApiPaths } from "@/lib/web-api-paths";

function truncate(text: string, max = 120): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function AdminRagGoldPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const env = searchParams.get("env") ?? "dev";
  const file = searchParams.get("file") ?? "";
  const pageRaw = searchParams.get("page");
  const page = pageRaw && /^\d+$/.test(pageRaw) ? Math.max(1, Number.parseInt(pageRaw, 10)) : 1;
  const qParam = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(qParam);
  const [data, setData] = useState<AdminGoldRowsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAnswerCol, setShowAnswerCol] = useState(false);

  const offset = (page - 1) * GOLD_ROWS_DEFAULT_LIMIT;

  const apiUrl = useMemo(() => {
    if (!file) return null;
    const params = new URLSearchParams({
      env,
      file,
      offset: String(offset),
      limit: String(GOLD_ROWS_DEFAULT_LIMIT),
    });
    if (qParam.trim()) params.set("q", qParam.trim());
    return `${webApiPaths.admin.ragGold}?${params.toString()}`;
  }, [env, file, offset, qParam]);

  const load = useCallback(async () => {
    if (!apiUrl) {
      setError("Missing file query param");
      setData(null);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const me = await authFetch(webApiPaths.auth.me);
      if (!me.ok) {
        setError("Sign in required");
        setData(null);
        return;
      }
      const meBody = (await me.json()) as { signedIn?: boolean };
      if (!meBody.signedIn) {
        setError("Sign in required");
        setData(null);
        return;
      }

      const res = await authFetch(apiUrl);
      if (res.status === 403) {
        setForbidden(true);
        setData(null);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Request failed (${res.status})`);
        setData(null);
        return;
      }
      setForbidden(false);
      setData((await res.json()) as AdminGoldRowsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gold dataset");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / GOLD_ROWS_DEFAULT_LIMIT)) : 1;

  const goPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`/admin/rag-gold?${params.toString()}`);
  };

  const applySearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    params.delete("page");
    router.push(`/admin/rag-gold?${params.toString()}`);
  };

  const title = data?.label ?? file.replace(/\.jsonl$/i, "").replace(/_/g, " ");

  return (
    <AdminShell
      title={file ? `Gold dataset — ${title}` : "Gold dataset"}
      subtitle={
        file
          ? `${env} · ${file}${data ? ` · ${data.total} rows` : ""}`
          : "Select a file from the admin overview RAG Gold eval panel."
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="admin-btn-secondary">
            ← Overview
          </Link>
          {data?.githubUrl ? (
            <a
              href={data.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn-secondary"
            >
              GitHub
            </a>
          ) : null}
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => setShowAnswerCol((prev) => !prev)}
          >
            {showAnswerCol ? "Hide answers" : "Show answers"}
          </button>
          <button type="button" className="admin-btn-secondary" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      }
    >
      <AdminGate loading={loading} forbidden={forbidden} error={error} onRetry={() => void load()}>
        {!file ? (
          <p className="admin-muted">
            Open a dataset from{" "}
            <Link href="/admin" className="admin-link">
              Dashboard overview
            </Link>{" "}
            → RAG Gold eval cards.
          </p>
        ) : (
          <>
            <div className="admin-gold-viewer-toolbar">
              <input
                type="search"
                className="admin-gold-search"
                placeholder="Filter questions, answers, must_contain…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
              />
              <button type="button" className="admin-btn-secondary" onClick={applySearch}>
                Search
              </button>
            </div>

            {data && data.rows.length === 0 ? (
              <p className="admin-muted">No rows match this filter.</p>
            ) : data ? (
              <>
                <div className="admin-table-wrap">
                  <table className="admin-table admin-table--gold">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Question</th>
                        {showAnswerCol ? <th>Gold answer</th> : null}
                        <th>Expected</th>
                        <th>Bucket</th>
                        <th>Must contain</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row, idx) => {
                        const rowKey = row.id ?? `${offset + idx}`;
                        const expanded = expandedId === rowKey;
                        return (
                          <tr
                            key={rowKey}
                            className={expanded ? "admin-gold-row--expanded" : undefined}
                            onClick={() => setExpandedId(expanded ? null : rowKey)}
                          >
                            <td>{offset + idx + 1}</td>
                            <td className="admin-gold-cell-question">{row.question}</td>
                            {showAnswerCol ? (
                              <td className="admin-gold-cell-answer">
                                {row.answer ? truncate(row.answer, 200) : "—"}
                              </td>
                            ) : null}
                            <td>
                              {row.expectedBehavior ? (
                                <span className="admin-pill admin-pill--unknown">{row.expectedBehavior}</span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {row.evalBucket ? (
                                <code className="admin-code">{row.evalBucket}</code>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="admin-gold-cell-tags">
                              {row.mustContain.length ? row.mustContain.join(" · ") : "—"}
                            </td>
                            <td>{row.source ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="admin-gold-pagination">
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    disabled={page <= 1}
                    onClick={() => goPage(page - 1)}
                  >
                    Previous
                  </button>
                  <span className="admin-muted">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    disabled={page >= totalPages}
                    onClick={() => goPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : null}
          </>
        )}
      </AdminGate>
    </AdminShell>
  );
}

export default function AdminRagGoldPage() {
  return (
    <Suspense fallback={<AdminShell title="Gold dataset" subtitle="Loading…"><p className="admin-muted">Loading…</p></AdminShell>}>
      <AdminRagGoldPageInner />
    </Suspense>
  );
}
