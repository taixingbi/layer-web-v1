"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  GRAFANA_OBSERVABILITY_LINKS,
  grafanaObservabilityUrl,
  grafanaUiBase,
} from "@/lib/admin/grafana-links";

export function AdminObservabilityPage() {
  const uiBase = grafanaUiBase();

  return (
    <AdminShell
      title="Observability"
      subtitle="Metrics and logs — opens Grafana Cloud (no in-cluster query API from HuntAI)."
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
          <h2 className="admin-panel-title">Dashboards</h2>
          <p className="admin-muted admin-inline-note">
            HuntAI dashboards on Grafana Cloud. Sign in to explore logs, GPU metrics, and vLLM
            workloads.
          </p>
          <ul className="admin-argocd-link-list">
            {GRAFANA_OBSERVABILITY_LINKS.map((item) => (
              <li key={item.path}>
                <a
                  href={grafanaObservabilityUrl(item.path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-argocd-app-link"
                >
                  <span className="admin-argocd-app-label">
                    {item.label}
                    {item.hint ? (
                      <span className="admin-muted"> · {item.hint}</span>
                    ) : null}
                  </span>
                  <code className="admin-code">{item.path.split("?")[0]}</code>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
