"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";

import type {
  AdminGoldDatasetFile,
  AdminGpuDevice,
  AdminInferenceSection,
  AdminOverviewPayload,
  AdminRecentRequest,
  AdminServiceHealth,
  ServiceStatus,
} from "@/lib/admin/types";
import { formatGoldFileBytes, goldDatasetViewerUrl } from "@/lib/admin/rag-gold-dataset";

type Props = {
  data: AdminOverviewPayload;
  onRefresh?: () => void;
};

function fmtNum(value: number | null | undefined, suffix = ""): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value}${suffix}`;
}

function fmtPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function fmtShaPrefix(sha: string | null | undefined): string {
  if (!sha) return "—";
  return sha.length > 8 ? `${sha.slice(0, 8)}…` : sha;
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function statusIcon(status: ServiceStatus): string {
  if (status === "healthy") return "✓";
  if (status === "degraded") return "!";
  if (status === "unhealthy") return "✗";
  return "·";
}

function statusClass(status: ServiceStatus): string {
  return `admin-status admin-status--${status}`;
}

const PIPELINE_STEPS = [
  "User",
  "API Gateway",
  "Orchestrator / Router",
  "Inference Gateway",
  "vLLM",
  "GPU Cluster",
] as const;

const PIPELINE_BRANCH_AFTER = "Orchestrator / Router";

const PIPELINE_BRANCHES = ["RAG → Qdrant", "GitHub / Web", "Direct LLM"] as const;

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-kpi">
      <div className="admin-kpi-label">{label}</div>
      <div className="admin-kpi-value">{value}</div>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`admin-panel ${className}`.trim()}>
      <h2 className="admin-panel-title">{title}</h2>
      {children}
    </section>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function GoldDatasetCard({ file, env }: { file: AdminGoldDatasetFile; env: string }) {
  return (
    <Link
      className={`admin-gold-card admin-gold-card--${file.bucket}`}
      href={goldDatasetViewerUrl(env, file.name)}
      title={file.name}
    >
      <div className="admin-gold-card-head">
        <span className="admin-gold-card-label">{file.label}</span>
        {file.usedInLastRun ? <span className="admin-gold-card-badge">last run</span> : null}
      </div>
      <p className="admin-gold-card-desc">{file.description}</p>
      <div className="admin-gold-card-meta">
        <span>{file.rows != null ? `${file.rows} rows` : "— rows"}</span>
        <span>{formatGoldFileBytes(file.bytes)}</span>
      </div>
    </Link>
  );
}

function GoldDatasetSection({ ragEval }: { ragEval: AdminOverviewPayload["ragEval"] }) {
  const { goldDataset } = ragEval;
  const envKey = ragEval.env.trim().toLowerCase();
  const repoUrl = goldDataset.repoUrl || `https://github.com/taixingbi/layer-rag-evaluation-v1/tree/main/data_${envKey === "prod" ? "prod" : "dev"}/gold_dataset`;

  return (
    <section className="admin-gold-section">
      <div className="admin-gold-header">
        <div className="admin-gold-header-main">
          <span className={`admin-cicd-env-badge admin-cicd-env-badge--${envKey === "prod" ? "prod" : "dev"}`}>
            {envKey}
          </span>
          <span className="admin-gold-header-title">Gold dataset</span>
          {goldDataset.totalRows != null ? (
            <span className="admin-muted admin-gold-header-stat">
              {goldDataset.files.length} files · {goldDataset.totalRows} rows
              {goldDataset.totalBytes != null ? ` · ${formatGoldFileBytes(goldDataset.totalBytes)}` : ""}
            </span>
          ) : null}
        </div>
        <a className="admin-gold-repo-btn" href={repoUrl} target="_blank" rel="noopener noreferrer">
          <GitHubIcon />
          GitHub
        </a>
      </div>
      {goldDataset.files.length > 0 ? (
        <div className="admin-gold-grid">
          {goldDataset.files.map((file) => (
            <GoldDatasetCard key={file.name} file={file} env={envKey} />
          ))}
        </div>
      ) : (
        <p className="admin-muted admin-gold-empty">Could not load gold files from GitHub.</p>
      )}
    </section>
  );
}

function RagEvalPanel({ ragEval }: { ragEval: AdminOverviewPayload["ragEval"] }) {
  const hasRun = ragEval.source === "supabase" && ragEval.runId != null;
  return (
    <Panel title="RAG — Gold eval" className={`admin-panel--${ragEval.env.trim().toLowerCase() === "prod" ? "prod" : "dev"}`}>
      {hasRun ? (
        <p className="admin-muted admin-inline-note">
          Latest run ({ragEval.env}
          {ragEval.collectionBase ? ` · ${ragEval.collectionBase}` : ""})
        </p>
      ) : (
        <p className="admin-muted admin-inline-note">
          No eval runs in Supabase (run <code className="admin-code">run_eval --record-supabase</code>)
        </p>
      )}
      <GoldDatasetSection ragEval={ragEval} />
      <h3 className="admin-section-label">Eval metrics</h3>
      <dl className="admin-dl admin-dl--metrics">
        <div>
          <dt>MRR (rerank)</dt>
          <dd>{fmtPct(ragEval.mrrRerank)}</dd>
        </div>
        <div>
          <dt>Recall@5</dt>
          <dd>{fmtPct(ragEval.recallAt5Rerank)}</dd>
        </div>
        <div>
          <dt>NDCG@5</dt>
          <dd>{fmtPct(ragEval.ndcgAt5Rerank)}</dd>
        </div>
        <div>
          <dt>LLM judge</dt>
          <dd>{fmtPct(ragEval.llmJudgeScoreMean)}</dd>
        </div>
        <div>
          <dt>Latency P50</dt>
          <dd>{fmtMs(ragEval.latencyMsP50)}</dd>
        </div>
        <div>
          <dt>Latency P95</dt>
          <dd>{fmtMs(ragEval.latencyMsP95)}</dd>
        </div>
        <div>
          <dt>Rows evaluated</dt>
          <dd>{fmtNum(ragEval.rowsEvaluated)}</dd>
        </div>
        <div>
          <dt>Pass</dt>
          <dd>
            {ragEval.pass == null ? (
              "—"
            ) : (
              <span className={`admin-pill admin-pill--${ragEval.pass ? "success" : "error"}`}>
                {ragEval.pass ? "pass" : "fail"}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Last run</dt>
          <dd>{fmtDateTime(ragEval.evaluatedAt)}</dd>
        </div>
        <div>
          <dt>Gold SHA</dt>
          <dd>
            <code className="admin-code">{fmtShaPrefix(ragEval.goldDatasetSha256)}</code>
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

function ServiceHealthInspectModal({
  service,
  onClose,
}: {
  service: AdminServiceHealth;
  onClose: () => void;
}) {
  const json = JSON.stringify(service.probeResponse ?? { note: "No probe payload" }, null, 2);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      /* ignore */
    }
  }, [json]);

  return (
    <div className="admin-health-inspect-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-health-inspect-panel"
        role="dialog"
        aria-labelledby="admin-health-inspect-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-health-inspect-header">
          <div>
            <h3 id="admin-health-inspect-title" className="admin-health-inspect-title">
              {service.name}
            </h3>
            <p className="admin-health-inspect-subtitle">
              {statusIcon(service.status)} {service.status}
              {service.summary ? ` — ${service.summary}` : ""}
            </p>
          </div>
          <div className="admin-health-inspect-actions">
            <button type="button" className="admin-btn-secondary" onClick={() => void copy()}>
              Copy JSON
            </button>
            <button type="button" className="admin-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <pre className="admin-health-inspect-pre">{json}</pre>
      </div>
    </div>
  );
}

function ServiceHealthList({ services }: { services: AdminServiceHealth[] }) {
  const [inspect, setInspect] = useState<AdminServiceHealth | null>(null);

  return (
    <>
      <ul className="admin-health-list">
        {services.map((svc) => {
          const hint = svc.summary ?? svc.detail ?? undefined;
          const clickable = Boolean(svc.probeResponse);
          return (
            <li key={svc.id} className="admin-health-row">
              {clickable ? (
                <button
                  type="button"
                  className="admin-health-name admin-health-name--btn"
                  title={hint}
                  onClick={() => setInspect(svc)}
                >
                  {svc.name}
                </button>
              ) : (
                <span className="admin-health-name" title={hint}>
                  {svc.name}
                </span>
              )}
              <button
                type="button"
                className={`${statusClass(svc.status)} admin-health-status-btn`}
                title={hint ?? (clickable ? "View probe response" : undefined)}
                disabled={!clickable}
                onClick={() => clickable && setInspect(svc)}
              >
                {statusIcon(svc.status)}
              </button>
            </li>
          );
        })}
      </ul>
      {inspect ? <ServiceHealthInspectModal service={inspect} onClose={() => setInspect(null)} /> : null}
    </>
  );
}

function RouteDistribution({ distribution }: { distribution: Record<string, number> }) {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <p className="admin-muted">No route data yet</p>;
  }
  return (
    <ul className="admin-kv-list">
      {entries.map(([route, pct]) => (
        <li key={route} className="admin-kv-row">
          <span className="admin-kv-key">{route}</span>
          <span className="admin-kv-val">{pct}%</span>
        </li>
      ))}
    </ul>
  );
}

function InferenceWorkloadCard({
  workload,
  runtime,
}: {
  workload: AdminInferenceSection["workloads"][number];
  runtime: string;
}) {
  const throughputLabel = workload.id === "reranker" ? "Req/s" : "Tokens/s";
  return (
    <div className="admin-inference-workload">
      <div className="admin-inference-workload-title">{workload.label}</div>
      <dl className="admin-dl">
        <div>
          <dt>Model</dt>
          <dd>{workload.model ?? "—"}</dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd>{runtime}</dd>
        </div>
        <div>
          <dt>Replicas</dt>
          <dd>{fmtNum(workload.replicas)}</dd>
        </div>
        <div>
          <dt>{throughputLabel}</dt>
          <dd>{fmtNum(workload.tokensPerSecond)}</dd>
        </div>
        <div>
          <dt>E2E P50</dt>
          <dd>{fmtMs(workload.latencyP50Ms)}</dd>
        </div>
      </dl>
    </div>
  );
}

function GpuCard({ device }: { device: AdminGpuDevice }) {
  return (
    <div className="admin-gpu-card">
      <div className="admin-gpu-name">{device.name}</div>
      <dl className="admin-dl">
        <div>
          <dt>Util</dt>
          <dd>{fmtNum(device.util, "%")}</dd>
        </div>
        <div>
          <dt>Memory</dt>
          <dd>
            {device.memoryUsedGb != null && device.memoryTotalGb != null
              ? `${device.memoryUsedGb}/${device.memoryTotalGb} GB`
              : device.memoryUsedGb != null
                ? `${device.memoryUsedGb} GB used`
                : "—"}
          </dd>
        </div>
        <div>
          <dt>Temp</dt>
          <dd>{device.tempC != null ? `${device.tempC}°C` : "—"}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{device.powerW != null ? `${device.powerW} W` : "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

function RecentRequestsTable({ rows }: { rows: AdminRecentRequest[] }) {
  if (rows.length === 0) {
    return <p className="admin-muted">No recent requests (configure Supabase service key)</p>;
  }
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Route</th>
            <th>Latency</th>
            <th>Tokens</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.at}-${row.route}-${i}`}>
              <td>{row.at}</td>
              <td>
                <code className="admin-code">{row.route}</code>
              </td>
              <td>{fmtMs(row.latencyMs)}</td>
              <td>{fmtNum(row.tokens)}</td>
              <td>
                <span className={`admin-pill admin-pill--${row.status}`}>{row.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminDashboard({ data }: Props) {
  const { overview, services, router, ragEval, inference, gpu, recentRequests, feedback } = data;

  return (
    <div className="admin-dashboard">
      <p className="admin-subtitle admin-source-line">
        Data sources
        <span className="admin-source-tags">
          <span className={`admin-tag admin-tag--${data.sources.prometheus}`}>Prometheus</span>
          <span className={`admin-tag admin-tag--${data.sources.supabase}`}>Supabase</span>
        </span>
      </p>

      <div className="admin-kpi-grid">
        <KpiCard label="Users Online" value={fmtNum(overview.usersOnline)} />
        <KpiCard label="Requests/min" value={fmtNum(overview.requestsPerMinute)} />
        <KpiCard label="Success Rate" value={overview.successRate != null ? `${overview.successRate}%` : "—"} />
        <KpiCard label="Avg Latency" value={fmtMs(overview.avgLatencyMs)} />
        <KpiCard label="GPU Util" value={overview.gpuUtil != null ? `${overview.gpuUtil}%` : "—"} />
        <KpiCard label="Version" value={overview.version} />
      </div>

      <div className="admin-row admin-row--2-1">
        <Panel title="Request / AI Pipeline" className="admin-panel--pipeline">
          <ol className="admin-pipeline">
            {PIPELINE_STEPS.map((step, idx) => (
              <li key={step}>
                <span>{step}</span>
                {step === PIPELINE_BRANCH_AFTER ? (
                  <ul className="admin-pipeline-branch">
                    {PIPELINE_BRANCHES.map((branch) => (
                      <li key={branch}>{branch}</li>
                    ))}
                  </ul>
                ) : null}
                {idx < PIPELINE_STEPS.length - 1 ? <span className="admin-pipeline-arrow">↓</span> : null}
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Service Health">
          <ServiceHealthList services={services} />
        </Panel>
      </div>

      <div className="admin-row admin-row--half">
        <Panel title="Router">
          <dl className="admin-dl admin-dl--inline">
            <div>
              <dt>Version</dt>
              <dd>{router.version}</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>
                {router.accuracy != null ? `${router.accuracy}%` : "—"}
                {router.accuracySource === "golden_eval" ? (
                  <span className="admin-muted admin-inline-note"> eval</span>
                ) : null}
              </dd>
            </div>
          </dl>
          <h3 className="admin-section-label">Route distribution</h3>
          <RouteDistribution distribution={router.distribution} />
        </Panel>
        <RagEvalPanel ragEval={ragEval} />
      </div>

      <div className="admin-row admin-row--half">
        <Panel title="Inference">
          <div className="admin-inference-grid">
            {inference.workloads.map((workload) => (
              <InferenceWorkloadCard key={workload.id} workload={workload} runtime={inference.runtime} />
            ))}
          </div>
        </Panel>
        <Panel title="GPU Cluster (DCGM)">
          {gpu.length === 0 ? (
            <p className="admin-muted">No GPU metrics (configure PROMETHEUS_URL)</p>
          ) : (
            <div className="admin-gpu-grid">
              {gpu.map((device) => (
                <GpuCard key={device.name} device={device} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent Requests" className="admin-panel--full">
        <RecentRequestsTable rows={recentRequests} />
      </Panel>

      <Panel title="User Feedback" className="admin-panel--full">
        {feedback.source === "unavailable" ? (
          <p className="admin-muted">No feedback data (configure Supabase service key)</p>
        ) : (
          <>
            <div className="admin-feedback-summary">
              <div>
                <span className="admin-feedback-label">👍 Positive</span>
                <span className="admin-feedback-value">
                  {feedback.positivePct != null ? `${feedback.positivePct}%` : "—"}
                </span>
              </div>
              <div>
                <span className="admin-feedback-label">👎 Negative</span>
                <span className="admin-feedback-value">
                  {feedback.negativePct != null ? `${feedback.negativePct}%` : "—"}
                </span>
              </div>
            </div>
            {feedback.topIssues.length > 0 ? (
              <>
                <h3 className="admin-section-label">Top issues</h3>
                <ul className="admin-issue-list">
                  {feedback.topIssues.map((issue) => (
                    <li key={issue.label}>
                      {issue.label}
                      <span className="admin-muted"> ({issue.count})</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </Panel>
    </div>
  );
}
