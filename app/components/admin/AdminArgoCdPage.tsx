"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  ARGOCD_DEV_WORKFLOW,
  ARGOCD_PROD_WORKFLOW,
  ARGOCD_SHARED_MONITOR_APPS,
  ARGOCD_SHARED_PLATFORM_APPS,
  argocdApplicationUrl,
  argocdUiBase,
  githubActionsUrl,
  type ArgoCdAppLink,
  type ArgoCdStackWorkflow,
} from "@/lib/admin/argocd-links";

function CicdAppCard({
  app,
  monitor,
  detail = "none",
}: {
  app: ArgoCdAppLink;
  monitor?: boolean;
  /** Stack columns: label only. Shared: show source repo. */
  detail?: "none" | "repo";
}) {
  return (
    <div
      className={`admin-argocd-app-card${monitor ? " admin-argocd-app-card--monitor" : ""}`}
    >
      <div className="admin-argocd-app-card-header">
        <span className="admin-argocd-app-label">{app.label}</span>
        {detail === "repo" ? <code className="admin-code">{app.githubRepo}</code> : null}
      </div>
      <div className="admin-argocd-pipeline-links">
        <a
          href={githubActionsUrl(app.githubRepo, app.workflow)}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-argocd-pipeline-link"
        >
          Build →
        </a>
        <a
          href={argocdApplicationUrl(app.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-argocd-pipeline-link admin-argocd-pipeline-link--deploy"
        >
          Deploy →
        </a>
      </div>
    </div>
  );
}

function WorkflowArrow() {
  return (
    <span className="admin-argocd-workflow-arrow" aria-hidden>
      ↓
    </span>
  );
}

function CicdWorkflowColumn({ workflow }: { workflow: ArgoCdStackWorkflow }) {
  return (
    <div className="admin-argocd-workflow">
      {workflow.linear.map((app) => (
        <div key={app.name} className="admin-argocd-workflow-step">
          <CicdAppCard app={app} />
          <WorkflowArrow />
        </div>
      ))}

      <div className="admin-argocd-workflow-step admin-argocd-workflow-step--branch">
        <div className="admin-argocd-workflow-branch-row">
          {workflow.branch.map((app) => (
            <CicdAppCard key={app.name} app={app} />
          ))}
        </div>
        <WorkflowArrow />
      </div>
    </div>
  );
}

function CicdSharedGrid({
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
          <CicdAppCard app={app} monitor={monitor} detail="repo" />
        </li>
      ))}
    </ul>
  );
}

export function AdminArgoCdPage() {
  const uiBase = argocdUiBase();

  return (
    <AdminShell
      title="CI/CD"
      subtitle="GitHub Actions build → Argo CD deploy. Links only — no CI or GitOps API from HuntAI."
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
              Project <code className="admin-code">ai-dev</code> — push <code className="admin-code">dev</code>{" "}
              branch pins image
            </p>
            <CicdWorkflowColumn workflow={ARGOCD_DEV_WORKFLOW} />
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Applications (prod)</h2>
            <p className="admin-muted admin-inline-note">
              Project <code className="admin-code">ai-prod</code> — push <code className="admin-code">main</code>{" "}
              · manual sync
            </p>
            <CicdWorkflowColumn workflow={ARGOCD_PROD_WORKFLOW} />
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
          <CicdSharedGrid apps={ARGOCD_SHARED_PLATFORM_APPS} />

          <p className="admin-muted admin-inline-note admin-argocd-monitor-note">
            Monitoring (not on the request path)
          </p>
          <CicdSharedGrid apps={ARGOCD_SHARED_MONITOR_APPS} monitor />
        </section>
      </div>
    </AdminShell>
  );
}
