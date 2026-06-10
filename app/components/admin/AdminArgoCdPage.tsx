"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  ARGOCD_DEV_APPS,
  argocdApplicationUrl,
  argocdUiBase,
} from "@/lib/admin/argocd-links";

export function AdminArgoCdPage() {
  const uiBase = argocdUiBase();

  return (
    <AdminShell
      title="ArgoCD"
      subtitle="GitOps deploy status — opens the Argo CD UI (no in-cluster API from HuntAI)."
      actions={
        <a
          href={uiBase}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn-secondary"
        >
          Open Argo CD
        </a>
      }
    >
      <div className="admin-dashboard">
        <section className="admin-panel admin-panel--full">
          <h2 className="admin-panel-title">Applications (dev)</h2>
          <p className="admin-muted admin-inline-note">
            Sync, health, diffs, and rollback live in Argo CD. Use the links below or open the full
            dashboard.
          </p>
          <ul className="admin-argocd-link-list">
            {ARGOCD_DEV_APPS.map((app) => (
              <li key={app.name}>
                <a
                  href={argocdApplicationUrl(app.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-argocd-app-link"
                >
                  <span className="admin-argocd-app-label">{app.label}</span>
                  <code className="admin-code">{app.name}</code>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
