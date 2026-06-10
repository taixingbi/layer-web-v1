"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  GRAFANA_DASHBOARDS,
  GRAFANA_LOG_SERVICES,
  grafanaDashboardUrl,
  grafanaUiBase,
  serviceLogExploreUrl,
} from "@/lib/admin/grafana-links";

export function AdminLogsPage() {
  const uiBase = grafanaUiBase();

  return (
    <AdminShell
      title="Logs"
      subtitle="Log search and dashboards — opens Grafana Cloud (no in-cluster Loki API from HuntAI)."
      actions={
        <a
          href={uiBase}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn-secondary"
        >
          Open Grafana
        </a>
      }
    >
      <div className="admin-dashboard">
        <section className="admin-panel admin-panel--full">
          <h2 className="admin-panel-title">Explore (Loki)</h2>
          <p className="admin-muted admin-inline-note">
            Pre-filtered LogQL for HuntAI workloads in Grafana Explore. Sign in to Grafana Cloud to
            search, filter, and trace requests.
          </p>
          <ul className="admin-argocd-link-list">
            {GRAFANA_LOG_SERVICES.map((svc) => (
              <li key={svc.app}>
                <a
                  href={serviceLogExploreUrl(svc.app)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-argocd-app-link"
                >
                  <span className="admin-argocd-app-label">{svc.label}</span>
                  <code className="admin-code">{svc.app}</code>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-panel admin-panel--full">
          <h2 className="admin-panel-title">Dashboards</h2>
          <p className="admin-muted admin-inline-note">
            Imported HuntAI dashboards (metrics + Loki). Manage imports in{" "}
            <code className="admin-code">huntai-k3s/grafana-import/</code>.
          </p>
          <ul className="admin-argocd-link-list">
            {GRAFANA_DASHBOARDS.map((dash) => (
              <li key={dash.uid}>
                <a
                  href={grafanaDashboardUrl(dash.uid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-argocd-app-link"
                >
                  <span className="admin-argocd-app-label">{dash.label}</span>
                  <code className="admin-code">{dash.uid}</code>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
