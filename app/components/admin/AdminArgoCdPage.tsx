"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  ARGOCD_DEV_STACK_APPS,
  ARGOCD_PROD_STACK_APPS,
  ARGOCD_SHARED_APPS,
  argocdApplicationUrl,
  argocdUiBase,
  type ArgoCdAppLink,
} from "@/lib/admin/argocd-links";

function ArgoCdAppList({
  apps,
  stack,
}: {
  apps: ArgoCdAppLink[];
  stack?: boolean;
}) {
  return (
    <ul
      className={`admin-argocd-link-list${stack ? " admin-argocd-link-list--stack" : ""}`}
    >
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
        <div className="admin-argocd-env-grid">
          <section className="admin-panel">
            <h2 className="admin-panel-title">Applications (dev)</h2>
            <p className="admin-muted admin-inline-note">
              Project <code className="admin-code">ai-dev</code>
            </p>
            <ArgoCdAppList apps={ARGOCD_DEV_STACK_APPS} stack />
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Applications (prod)</h2>
            <p className="admin-muted admin-inline-note">
              Project <code className="admin-code">ai-prod</code> — manual sync
            </p>
            <ArgoCdAppList apps={ARGOCD_PROD_STACK_APPS} stack />
          </section>
        </div>

        <section className="admin-panel admin-panel--full">
          <h2 className="admin-panel-title">Shared</h2>
          <p className="admin-muted admin-inline-note">
            Dev / platform workloads — no separate prod Argo CD Application.
          </p>
          <ArgoCdAppList apps={ARGOCD_SHARED_APPS} />
        </section>
      </div>
    </AdminShell>
  );
}
