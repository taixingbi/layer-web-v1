"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  ARGOCD_DEV_APPS,
  ARGOCD_PROD_APPS,
  argocdApplicationUrl,
  argocdUiBase,
} from "@/lib/admin/argocd-links";

function ArgoCdAppList({ apps }: { apps: Array<{ name: string; label: string }> }) {
  return (
    <ul className="admin-argocd-link-list">
      {apps.map((app) => (
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
  );
}

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
          <ArgoCdAppList apps={ARGOCD_DEV_APPS} />
        </section>

        <section className="admin-panel admin-panel--full">
          <h2 className="admin-panel-title">Applications (prod)</h2>
          <p className="admin-muted admin-inline-note">
            Project <code className="admin-code">ai-prod</code> — manual sync; check OutOfSync before
            promote.
          </p>
          <ArgoCdAppList apps={ARGOCD_PROD_APPS} />
        </section>
      </div>
    </AdminShell>
  );
}
