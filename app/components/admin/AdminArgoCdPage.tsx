"use client";

import { useState } from "react";

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

type CicdEnv = "dev" | "prod";

const CICD_ENV_CONFIG: Record<
  CicdEnv,
  {
    workflow: ArgoCdStackWorkflow;
    project: string;
    branch: string;
    note: string;
    panelClass: string;
    tintClass: string;
    toggleClass: string;
  }
> = {
  dev: {
    workflow: ARGOCD_DEV_WORKFLOW,
    project: "ai-dev",
    branch: "dev",
    note: "branch pins image",
    panelClass: "admin-panel--dev",
    tintClass: "admin-argocd-stack-panel--dev",
    toggleClass: "admin-cicd-env-toggle__btn--dev",
  },
  prod: {
    workflow: ARGOCD_PROD_WORKFLOW,
    project: "ai-prod",
    branch: "main",
    note: "· manual sync",
    panelClass: "admin-panel--prod",
    tintClass: "admin-argocd-stack-panel--prod",
    toggleClass: "admin-cicd-env-toggle__btn--prod",
  },
};

function CicdEnvToggle({
  env,
  onChange,
}: {
  env: CicdEnv;
  onChange: (env: CicdEnv) => void;
}) {
  return (
    <div className="admin-cicd-env-toggle" role="tablist" aria-label="Environment">
      {(["dev", "prod"] as const).map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={env === key}
          className={[
            "admin-cicd-env-toggle__btn",
            CICD_ENV_CONFIG[key].toggleClass,
            env === key ? "admin-cicd-env-toggle__btn--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onChange(key)}
        >
          {key === "dev" ? "Dev" : "Prod"}
        </button>
      ))}
    </div>
  );
}

function CicdPipelineLegend() {
  return (
    <div className="admin-cicd-pipeline-legend" aria-hidden>
      <span className="admin-cicd-pipeline-legend__service" />
      <span className="admin-cicd-pipeline-legend__col">GitHub Actions</span>
      <span className="admin-cicd-pipeline-legend__col">Argo CD</span>
    </div>
  );
}

function CicdPipelineLinks({ app }: { app: ArgoCdAppLink }) {
  return (
    <div className="admin-argocd-pipeline-links">
      <a
        href={githubActionsUrl(app.githubRepo, app.workflow)}
        target="_blank"
        rel="noopener noreferrer"
        className="admin-argocd-pipeline-link"
        aria-label={`GitHub Actions for ${app.label}`}
        title="GitHub Actions"
      >
        Actions
      </a>
      <a
        href={argocdApplicationUrl(app.name)}
        target="_blank"
        rel="noopener noreferrer"
        className="admin-argocd-pipeline-link admin-argocd-pipeline-link--deploy"
        aria-label={`Argo CD for ${app.label}`}
        title="Argo CD"
      >
        Argo
      </a>
    </div>
  );
}

function CicdStackRow({ app }: { app: ArgoCdAppLink }) {
  return (
    <div className="admin-argocd-app-card admin-argocd-app-card--stack-row">
      <span className="admin-argocd-app-label">{app.label}</span>
      <CicdPipelineLinks app={app} />
    </div>
  );
}

function CicdSharedCard({
  app,
  monitor,
  strip,
}: {
  app: ArgoCdAppLink;
  monitor?: boolean;
  strip?: boolean;
}) {
  const cardClass = [
    "admin-argocd-app-card",
    "admin-argocd-app-card--shared",
    strip ? "admin-argocd-app-card--strip" : "",
    monitor ? "admin-argocd-app-card--monitor" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      <div className="admin-argocd-app-card-header">
        <span className="admin-argocd-app-label">{app.label}</span>
        <code className="admin-code">{app.githubRepo}</code>
      </div>
      <CicdPipelineLinks app={app} />
    </div>
  );
}

function WorkflowArrow() {
  return <span className="admin-argocd-workflow-arrow" aria-hidden />;
}

function CicdWorkflowColumn({ workflow }: { workflow: ArgoCdStackWorkflow }) {
  return (
    <div className="admin-argocd-workflow">
      <CicdPipelineLegend />
      {workflow.linear.map((app) => (
        <div key={app.name} className="admin-argocd-workflow-step">
          <CicdStackRow app={app} />
          <WorkflowArrow />
        </div>
      ))}

      <div className="admin-argocd-workflow-step admin-argocd-workflow-step--branch">
        <div className="admin-argocd-workflow-branch-row">
          {workflow.branch.map((app) => (
            <CicdStackRow key={app.name} app={app} />
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
    <>
      {!monitor ? <CicdPipelineLegend /> : null}
      <ul
        className={`admin-argocd-link-list${monitor ? " admin-argocd-link-list--monitor" : ""}`}
      >
        {apps.map((app) => (
          <li key={app.name} className={monitor ? "admin-argocd-link-item--full" : undefined}>
            <CicdSharedCard app={app} monitor={monitor} strip={monitor} />
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminArgoCdPage() {
  const uiBase = argocdUiBase();
  const [env, setEnv] = useState<CicdEnv>("dev");
  const config = CICD_ENV_CONFIG[env];

  return (
    <AdminShell
      title="CI/CD"
      subtitle="GitHub Actions → Argo CD. Links only — no CI or GitOps API from HuntAI."
      actions={
        <div className="admin-toolbar-actions">
          <CicdEnvToggle env={env} onChange={setEnv} />
          <a
            href={uiBase}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn-secondary"
          >
            Open Argo CD
          </a>
        </div>
      }
    >
      <div className="admin-dashboard admin-argocd-layout">
        <section
          className={`admin-panel admin-argocd-stack-panel ${config.panelClass} ${config.tintClass}`}
        >
          <div className="admin-argocd-stack-header">
            <h2 className="admin-panel-title">
              Applications
              <span className="admin-cicd-env-badge">{config.project}</span>
            </h2>
          </div>
          <p className="admin-muted admin-inline-note">
            Push <code className="admin-code">{config.branch}</code> {config.note}
          </p>
          <CicdWorkflowColumn key={env} workflow={config.workflow} />
        </section>

        <div className="admin-argocd-funnel admin-argocd-funnel--single" aria-hidden>
          <span className="admin-argocd-funnel-arrow" />
        </div>

        <section className="admin-panel admin-argocd-shared-panel">
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
