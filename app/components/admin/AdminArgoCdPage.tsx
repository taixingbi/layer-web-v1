"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminGate, AdminShell } from "@/components/admin/AdminShell";
import { authFetch } from "@/lib/auth-fetch";
import type { AdminArgoCdAppSummary, AdminArgoCdOverview } from "@/lib/admin/types";
import { webApiPaths } from "@/lib/web-api-paths";

function syncPill(sync: AdminArgoCdAppSummary["sync"]) {
  if (sync === "Synced") return "admin-pill admin-pill--success";
  if (sync === "OutOfSync") return "admin-pill admin-pill--error";
  return "admin-pill admin-pill--unknown";
}

function healthClass(health: AdminArgoCdAppSummary["health"]) {
  if (health === "Healthy") return "admin-status admin-status--healthy";
  if (health === "Degraded") return "admin-status admin-status--degraded";
  if (health === "Progressing") return "admin-status admin-status--degraded";
  return "admin-status admin-status--unhealthy";
}

export function AdminArgoCdPage() {
  const [data, setData] = useState<AdminArgoCdOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setError(null);
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

      const res = await authFetch(webApiPaths.admin.argocdApps);
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
      setData((await res.json()) as AdminArgoCdOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Argo CD");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const outOfSyncLabel = useMemo(() => {
    if (!data?.outOfSyncApps.length) return "none";
    return data.outOfSyncApps.join(", ");
  }, [data]);

  return (
    <AdminShell
      title="ArgoCD"
      subtitle="GitOps deploy status from the in-cluster Argo CD API."
      actions={
        <button type="button" className="admin-btn-secondary" onClick={() => void load()}>
          Refresh
        </button>
      }
    >
      <AdminGate loading={loading} forbidden={forbidden} error={error} onRetry={() => void load()}>
        {data ? (
          <div className="admin-dashboard">
            {data.source !== "argocd" ? (
              <p className="admin-alert admin-inline-note">{data.detail ?? "Argo CD not configured"}</p>
            ) : null}

            <div className="admin-kpi-grid">
              <div className="admin-kpi">
                <div className="admin-kpi-label">Apps synced</div>
                <div className="admin-kpi-value">
                  {data.syncedCount} / {data.totalCount}
                </div>
              </div>
              <div className="admin-kpi">
                <div className="admin-kpi-label">Apps healthy</div>
                <div className="admin-kpi-value">
                  {data.healthyCount} / {data.totalCount}
                </div>
              </div>
              <div className="admin-kpi">
                <div className="admin-kpi-label">Last sync</div>
                <div className="admin-kpi-value">{data.lastSyncLabel ?? "—"}</div>
              </div>
              <div className="admin-kpi">
                <div className="admin-kpi-label">Out of sync</div>
                <div className="admin-kpi-value admin-kpi-value--sm">{outOfSyncLabel}</div>
              </div>
            </div>

            <Panel title="Applications">
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>App</th>
                      <th>Env</th>
                      <th>Sync</th>
                      <th>Health</th>
                      <th>Image</th>
                      <th>Last deploy</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.apps.map((app) => (
                      <tr key={app.name}>
                        <td>
                          <Link href={`/admin/argocd/${encodeURIComponent(app.name)}`} className="admin-link">
                            {app.name}
                          </Link>
                        </td>
                        <td>{app.env}</td>
                        <td>
                          <span className={syncPill(app.sync)}>{app.sync}</span>
                        </td>
                        <td>
                          <span className={healthClass(app.health)} title={app.health}>
                            {app.health === "Healthy" ? "✓" : app.health === "Degraded" ? "!" : "✗"}
                          </span>
                        </td>
                        <td>
                          <code className="admin-code">{app.imageSha ?? "—"}</code>
                        </td>
                        <td>{app.lastDeployLabel ?? "—"}</td>
                        <td>
                          <a
                            href={app.uiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn-link"
                          >
                            ArgoCD
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        ) : null}
      </AdminGate>
    </AdminShell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="admin-panel admin-panel--full">
      <h2 className="admin-panel-title">{title}</h2>
      {children}
    </section>
  );
}
