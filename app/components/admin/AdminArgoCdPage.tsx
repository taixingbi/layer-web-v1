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
import { cicdEnvFromHostname, type CicdDeployEnv } from "@/lib/admin/cicd-env";

const ARGOCD_SHARED_ALL_APPS: ArgoCdAppLink[] = [
  ...ARGOCD_SHARED_PLATFORM_APPS,
  ...ARGOCD_SHARED_MONITOR_APPS,
];

const SHARED_PLATFORM_NOTE =
  "Gateways, vector store, vLLM, and observability — ai-dev only.";

const CICD_ENV_CONFIG: Record<
  CicdDeployEnv,
  {
    workflow: ArgoCdStackWorkflow;
    project: string;
    branch: string;
    note: string;
    panelClass: string;
    tintClass: string;
  }
> = {
  dev: {
    workflow: ARGOCD_DEV_WORKFLOW,
    project: "ai-dev",
    branch: "dev",
    note: "branch pins image",
    panelClass: "admin-panel--dev",
    tintClass: "admin-argocd-stack-panel--dev",
  },
  prod: {
    workflow: ARGOCD_PROD_WORKFLOW,
    project: "ai-prod",
    branch: "main",
    note: "· manual sync",
    panelClass: "admin-panel--prod",
    tintClass: "admin-argocd-stack-panel--prod",
  },
};

function useCicdDeployEnv(): CicdDeployEnv {
  const [env] = useState<CicdDeployEnv>(() =>
    typeof window !== "undefined" ? cicdEnvFromHostname(window.location.hostname) : "dev",
  );
  return env;
}

function CicdPipelineLinks({ app }: { app: ArgoCdAppLink }) {
  return (
    <div className="admin-argocd-pipeline-links">
      <a
        href={githubActionsUrl(app.githubRepo, app.workflow)}
        target="_blank"
        rel="noopener noreferrer"
        className="admin-argocd-pipeline-link"
        aria-label={`Build logs for ${app.label}`}
      >
        Build Logs
      </a>
      <a
        href={argocdApplicationUrl(app.name)}
        target="_blank"
        rel="noopener noreferrer"
        className="admin-argocd-pipeline-link admin-argocd-pipeline-link--deploy"
        aria-label={`Argo CD app for ${app.label}`}
      >
        Argo App
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

function CicdSharedCard({ app, monitor }: { app: ArgoCdAppLink; monitor?: boolean }) {
  const cardClass = [
    "admin-argocd-app-card",
    "admin-argocd-app-card--shared",
    monitor ? "admin-argocd-app-card--monitor" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      <span className="admin-argocd-app-label">{app.label}</span>
      <code className="admin-code admin-argocd-repo">{app.githubRepo}</code>
      <CicdPipelineLinks app={app} />
    </div>
  );
}

function WorkflowArrow() {
  return <span className="admin-argocd-workflow-arrow" aria-hidden />;
}

function CicdWorkflowColumn({ workflow }: { workflow: ArgoCdStackWorkflow }) {
  const lastLinearIndex = workflow.linear.length - 1;

  return (
    <div className="admin-argocd-workflow">
      {workflow.linear.map((app, index) => (
        <div key={app.name} className="admin-argocd-workflow-step">
          <CicdStackRow app={app} />
          {index < lastLinearIndex ? <WorkflowArrow /> : null}
        </div>
      ))}

      <WorkflowArrow />

      <div className="admin-argocd-workflow-step admin-argocd-workflow-step--branch">
        <div className="admin-argocd-workflow-branch-row">
          {workflow.branch.map((app) => (
            <CicdStackRow key={app.name} app={app} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CicdSharedGrid({ apps }: { apps: ArgoCdAppLink[] }) {
  const monitorNames = new Set(ARGOCD_SHARED_MONITOR_APPS.map((app) => app.name));

  return (
    <ul className="admin-argocd-link-list">
      {apps.map((app) => (
        <li key={app.name}>
          <CicdSharedCard app={app} monitor={monitorNames.has(app.name)} />
        </li>
      ))}
    </ul>
  );
}

export function AdminArgoCdPage() {
  const uiBase = argocdUiBase();
  const env = useCicdDeployEnv();
  const config = CICD_ENV_CONFIG[env];

  return (
    <AdminShell
      title="CI/CD"
      subtitle="GitHub Actions → Argo CD. Links only — no CI or GitOps API from HuntAI."
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
          <CicdWorkflowColumn workflow={config.workflow} />
        </section>

        <div className="admin-argocd-funnel admin-argocd-funnel--single">
          <span className="admin-argocd-funnel-label">depends on</span>
          <span className="admin-argocd-funnel-arrow" aria-hidden />
        </div>

        <section className="admin-panel admin-argocd-shared-panel admin-panel--dev">
          <h2 className="admin-panel-title">
            Shared platform
            <span className="admin-cicd-env-badge">ai-dev</span>
          </h2>
          <p className="admin-muted admin-inline-note">{SHARED_PLATFORM_NOTE}</p>
          <CicdSharedGrid apps={ARGOCD_SHARED_ALL_APPS} />
        </section>
      </div>
    </AdminShell>
  );
}
