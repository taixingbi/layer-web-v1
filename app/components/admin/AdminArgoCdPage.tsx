"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  ARGOCD_DEV_WORKFLOW,
  ARGOCD_PROD_WORKFLOW,
  ARGOCD_SHARED_MONITOR_APPS,
  ARGOCD_SHARED_PLATFORM_APPS,
  argocdApplicationUrl,
  argocdUiBase,
  type ArgoCdAppLink,
  type ArgoCdStackWorkflow,
} from "@/lib/admin/argocd-links";

function ArgoCdAppLinkCard({ app }: { app: ArgoCdAppLink }) {
  return (
    <a
      href={argocdApplicationUrl(app.name)}
      target="_blank"
      rel="noopener noreferrer"
      className="admin-argocd-app-link"
    >
      <span className="admin-argocd-app-label">{app.label}</span>
      <code className="admin-code">{app.name}</code>
    </a>
  );
}

function WorkflowArrow() {
  return (
    <span className="admin-argocd-workflow-arrow" aria-hidden>
      ↓
    </span>
  );
}

function ArgoCdWorkflowColumn({ workflow }: { workflow: ArgoCdStackWorkflow }) {
  return (
    <div className="admin-argocd-workflow">
      {workflow.linear.map((app) => (
        <div key={app.name} className="admin-argocd-workflow-step">
          <ArgoCdAppLinkCard app={app} />
          <WorkflowArrow />
        </div>
      ))}

      <div className="admin-argocd-workflow-step admin-argocd-workflow-step--branch">
        <div className="admin-argocd-workflow-branch-row">
          {workflow.branch.map((app) => (
            <ArgoCdAppLinkCard key={app.name} app={app} />
          ))}
        </div>
        <WorkflowArrow />
      </div>
    </div>
  );
}

function ArgoCdSharedGrid({
  apps,
  monitor,
}: {
  apps: ArgoCdAppLink[];
  monitor?: boolean;
}) {
  return (
    <ul className="admin-argocd-link-list">
      {apps.map((app) => (
        <li key={app.name}>
          <a
            href={argocdApplicationUrl(app.name)}
            target="_blank"
            rel="noopener noreferrer"
            className={`admin-argocd-app-link${monitor ? " admin-argocd-app-link--monitor" : ""}`}
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
              Project <code className="admin-code">ai-dev</code> — request flow top to bottom
            </p>
            <ArgoCdWorkflowColumn workflow={ARGOCD_DEV_WORKFLOW} />
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Applications (prod)</h2>
            <p className="admin-muted admin-inline-note">
              Project <code className="admin-code">ai-prod</code> — manual sync
            </p>
            <ArgoCdWorkflowColumn workflow={ARGOCD_PROD_WORKFLOW} />
          </section>
        </div>

        <div className="admin-argocd-funnel" aria-hidden>
          <span className="admin-argocd-funnel-arrow">↓</span>
          <span className="admin-argocd-funnel-arrow">↓</span>
        </div>

        <section className="admin-panel admin-panel--full">
          <h2 className="admin-panel-title">Shared</h2>
          <p className="admin-muted admin-inline-note">
            Platform backends (gateways, vector store, vLLM) — dev / platform only.
          </p>
          <ArgoCdSharedGrid apps={ARGOCD_SHARED_PLATFORM_APPS} />

          <p className="admin-muted admin-inline-note admin-argocd-monitor-note">
            Monitoring (not on the request path)
          </p>
          <ArgoCdSharedGrid apps={ARGOCD_SHARED_MONITOR_APPS} monitor />
        </section>
      </div>
    </AdminShell>
  );
}
