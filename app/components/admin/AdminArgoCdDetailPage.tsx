"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AdminGate, AdminShell } from "@/components/admin/AdminShell";
import { authFetch } from "@/lib/auth-fetch";
import type { AdminArgoCdAppDetail } from "@/lib/admin/types";
import { webApiPaths } from "@/lib/web-api-paths";

type Props = { appName: string };

export function AdminArgoCdDetailPage({ appName }: Props) {
  const [data, setData] = useState<AdminArgoCdAppDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const me = await authFetch(webApiPaths.auth.me);
      if (!me.ok || !(await me.json()).signedIn) {
        setError("Sign in required");
        return;
      }
      const res = await authFetch(webApiPaths.admin.argocdApp(appName));
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.status === 404) {
        setError("Application not found");
        return;
      }
      if (!res.ok) {
        setError(`Request failed (${res.status})`);
        return;
      }
      setForbidden(false);
      setData((await res.json()) as AdminArgoCdAppDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load app");
    } finally {
      setLoading(false);
    }
  }, [appName]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      title={appName}
      subtitle="Application detail from Argo CD."
      actions={
        <div className="admin-actions-row">
          <Link href="/admin/argocd" className="admin-btn-secondary">
            Back
          </Link>
          {data ? (
            <a href={data.uiUrl} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary">
              View in ArgoCD
            </a>
          ) : null}
        </div>
      }
    >
      <AdminGate loading={loading} forbidden={forbidden} error={error} onRetry={() => void load()}>
        {data ? (
          <div className="admin-dashboard">
            <section className="admin-panel">
              <h2 className="admin-panel-title">Status</h2>
              <dl className="admin-dl admin-dl--grid">
                <div>
                  <dt>Sync</dt>
                  <dd>{data.sync}</dd>
                </div>
                <div>
                  <dt>Health</dt>
                  <dd>{data.health}</dd>
                </div>
                <div>
                  <dt>Namespace</dt>
                  <dd>{data.namespace ?? "—"}</dd>
                </div>
                <div>
                  <dt>Overlay</dt>
                  <dd>
                    <code className="admin-code">{data.overlay ?? "—"}</code>
                  </dd>
                </div>
                <div>
                  <dt>Git revision</dt>
                  <dd>
                    <code className="admin-code">{data.syncRevision?.slice(0, 12) ?? data.gitRevision ?? "—"}</code>
                  </dd>
                </div>
                <div>
                  <dt>Target branch</dt>
                  <dd>{data.targetRevision ?? "—"}</dd>
                </div>
              </dl>
              {data.healthMessage ? <p className="admin-muted">{data.healthMessage}</p> : null}
            </section>

            <section className="admin-panel">
              <h2 className="admin-panel-title">Images</h2>
              {data.images.length ? (
                <ul className="admin-kv-list">
                  {data.images.map((img) => (
                    <li key={img} className="admin-code admin-log-line">
                      {img}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-muted">No images reported</p>
              )}
            </section>

            <section className="admin-panel admin-panel--full">
              <h2 className="admin-panel-title">Sync history</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Deployed</th>
                      <th>Revision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((h) => (
                      <tr key={h.id}>
                        <td>{h.id}</td>
                        <td>{h.deployedAt ? new Date(h.deployedAt).toLocaleString() : "—"}</td>
                        <td>
                          <code className="admin-code">{h.revision}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </AdminGate>
    </AdminShell>
  );
}
