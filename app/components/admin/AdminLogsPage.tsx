"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminGate, AdminShell } from "@/components/admin/AdminShell";
import { authFetch } from "@/lib/auth-fetch";
import type { AdminLogEntry, AdminLogsPayload } from "@/lib/admin/types";
import { webApiPaths } from "@/lib/web-api-paths";

const LEVELS = ["all", "error", "warn", "info"] as const;
const SINCE = ["15m", "1h", "24h"] as const;

function levelClass(level: string): string {
  const l = level.toUpperCase();
  if (l === "ERROR") return "admin-log-level admin-log-level--error";
  if (l === "WARN" || l === "WARNING") return "admin-log-level admin-log-level--warn";
  return "admin-log-level admin-log-level--info";
}

function formatRow(entry: AdminLogEntry): string {
  const parts = [entry.level, entry.app];
  if (entry.requestId) parts.push(entry.requestId);
  if (entry.route) parts.push(`route=${entry.route}`);
  if (entry.latencyMs != null) parts.push(`latency=${entry.latencyMs}ms`);
  return parts.join(" ");
}

export function AdminLogsPage() {
  const [service, setService] = useState("orchestrator");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("all");
  const [since, setSince] = useState<(typeof SINCE)[number]>("15m");
  const [search, setSearch] = useState("");
  const [pod, setPod] = useState("");
  const [data, setData] = useState<AdminLogsPayload | null>(null);
  const [trace, setTrace] = useState<AdminLogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const me = await authFetch(webApiPaths.auth.me);
      if (!me.ok || !(await me.json()).signedIn) {
        setError("Sign in required");
        setData(null);
        return;
      }

      const qs = new URLSearchParams({ service, since });
      if (level !== "all") qs.set("level", level);
      if (search.trim()) qs.set("search", search.trim());
      if (pod.trim()) qs.set("pod", pod.trim());

      const res = await authFetch(`${webApiPaths.admin.logs}?${qs.toString()}`);
      if (res.status === 403) {
        setForbidden(true);
        setData(null);
        return;
      }
      if (!res.ok) {
        setError(`Request failed (${res.status})`);
        setData(null);
        return;
      }
      setForbidden(false);
      const payload = (await res.json()) as AdminLogsPayload;
      setData(payload);

      const traceKey =
        search.trim() ||
        payload.entries.find((e) => e.requestId)?.requestId ||
        payload.entries.find((e) => e.traceId)?.traceId;
      if (traceKey) {
        const tqs = new URLSearchParams({
          trace: "1",
          search: traceKey,
          since,
        });
        const tres = await authFetch(`${webApiPaths.admin.logs}?${tqs.toString()}`);
        if (tres.ok) {
          const tbody = (await tres.json()) as AdminLogsPayload;
          setTrace(tbody.entries);
        } else {
          setTrace([]);
        }
      } else {
        setTrace([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [service, level, since, search, pod]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => data?.entries.find((e) => e.raw === selectedId || e.requestId === selectedId) ?? null,
    [data, selectedId],
  );

  const services = data?.services ?? [];

  return (
    <AdminShell
      title="Logs"
      subtitle="Live log tail from Grafana Cloud Loki (query_range)."
      actions={
        <button type="button" className="admin-btn-secondary" onClick={() => void load()}>
          Refresh
        </button>
      }
    >
      <AdminGate loading={loading && !data} forbidden={forbidden} error={error} onRetry={() => void load()}>
        <div className="admin-logs-layout">
          <aside className="admin-logs-services">
            <h2 className="admin-section-label">Services</h2>
            <ul className="admin-logs-service-list">
              {services.map((svc) => (
                <li key={svc.id}>
                  <button
                    type="button"
                    className={`admin-logs-service-btn${
                      service === svc.id ? " admin-logs-service-btn--active" : ""
                    }`}
                    onClick={() => setService(svc.id)}
                  >
                    {svc.name}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="admin-logs-main">
            <div className="admin-logs-filters">
              <label className="admin-filter">
                Level
                <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-filter">
                Time
                <select value={since} onChange={(e) => setSince(e.target.value as typeof since)}>
                  {SINCE.map((s) => (
                    <option key={s} value={s}>
                      last {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-filter admin-filter--grow">
                Search
                <input
                  type="search"
                  placeholder="request_id, session_id, error text…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void load();
                  }}
                />
              </label>
              <label className="admin-filter">
                Pod prefix
                <input
                  type="text"
                  placeholder="optional"
                  value={pod}
                  onChange={(e) => setPod(e.target.value)}
                />
              </label>
              <button type="button" className="admin-btn-secondary" onClick={() => void load()}>
                Apply
              </button>
            </div>

            {data?.source !== "loki" && data?.detail ? (
              <p className="admin-alert admin-inline-note">{data.detail}</p>
            ) : null}

            {data?.query ? (
              <p className="admin-muted admin-log-query">
                <code className="admin-code">{data.query}</code>
              </p>
            ) : null}

            <div className="admin-logs-stream">
              {loading ? <p className="admin-muted">Loading logs…</p> : null}
              {!loading && data?.entries.length === 0 ? (
                <p className="admin-muted">No log lines in this window.</p>
              ) : null}
              {data?.entries.map((entry) => (
                <button
                  type="button"
                  key={`${entry.tsNs}-${entry.raw.slice(0, 40)}`}
                  className={`admin-log-row${selectedId === entry.raw ? " admin-log-row--selected" : ""}`}
                  onClick={() => setSelectedId(entry.raw)}
                >
                  <span className="admin-log-ts">{entry.ts}</span>
                  <span className={levelClass(entry.level)}>{entry.level}</span>
                  <span className="admin-log-app">{entry.app}</span>
                  <span className="admin-log-msg">{formatRow(entry)} — {entry.message.slice(0, 160)}</span>
                </button>
              ))}
            </div>
          </div>

          <aside className="admin-logs-trace">
            <h2 className="admin-section-label">Request trace</h2>
            {selected ? (
              <div className="admin-trace-detail">
                <dl className="admin-dl">
                  {selected.requestId ? (
                    <div>
                      <dt>request_id</dt>
                      <dd>
                        <code className="admin-code">{selected.requestId}</code>
                      </dd>
                    </div>
                  ) : null}
                  {selected.traceId ? (
                    <div>
                      <dt>trace_id</dt>
                      <dd>
                        <code className="admin-code">{selected.traceId}</code>
                      </dd>
                    </div>
                  ) : null}
                  {selected.sessionId ? (
                    <div>
                      <dt>session_id</dt>
                      <dd>
                        <code className="admin-code">{selected.sessionId}</code>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <pre className="admin-log-raw">{selected.raw}</pre>
              </div>
            ) : (
              <p className="admin-muted">Select a log line for detail.</p>
            )}
            {trace.length > 0 ? (
              <>
                <h3 className="admin-section-label">Cross-service ({trace.length})</h3>
                <ul className="admin-trace-list">
                  {trace.slice(0, 40).map((entry) => (
                    <li key={`${entry.tsNs}-${entry.app}`} className="admin-trace-item">
                      <span className="admin-log-ts">{entry.ts.slice(11)}</span>{" "}
                      <span className={levelClass(entry.level)}>{entry.level}</span>{" "}
                      <span className="admin-log-app">{entry.app}</span>
                      <div className="admin-log-msg">{entry.message.slice(0, 120)}</div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </aside>
        </div>
      </AdminGate>
    </AdminShell>
  );
}
