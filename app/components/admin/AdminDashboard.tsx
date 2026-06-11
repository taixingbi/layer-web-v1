"use client";

import type { ReactNode } from "react";

import type {
  AdminGpuDevice,
  AdminInferenceSection,
  AdminOverviewPayload,
  AdminRecentRequest,
  AdminServiceHealth,
  ServiceStatus,
} from "@/lib/admin/types";

type Props = {
  data: AdminOverviewPayload;
  onRefresh?: () => void;
};

function fmtNum(value: number | null | undefined, suffix = ""): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value}${suffix}`;
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
  "Gateway API",
  "Orchestrator",
  "RAG / GitHub / Web",
  "Inference Gateway",
  "vLLM Cluster",
];

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

function ServiceHealthList({ services }: { services: AdminServiceHealth[] }) {
  return (
    <ul className="admin-health-list">
      {services.map((svc) => (
        <li key={svc.id} className="admin-health-row">
          <span className="admin-health-name">{svc.name}</span>
          <span className={statusClass(svc.status)} title={svc.detail ?? undefined}>
            {statusIcon(svc.status)}
          </span>
        </li>
      ))}
    </ul>
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
  const { overview, services, router, rag, inference, gpu, recentRequests, feedback } = data;

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
        <Panel title="AI Pipeline" className="admin-panel--pipeline">
          <ol className="admin-pipeline">
            {PIPELINE_STEPS.map((step, idx) => (
              <li key={step}>
                <span>{step}</span>
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
        <Panel title="RAG Metrics">
          <dl className="admin-dl">
            <div>
              <dt>Retrieval P50</dt>
              <dd>{fmtMs(rag.retrievalP50Ms)}</dd>
            </div>
            <div>
              <dt>Embed P50</dt>
              <dd>{fmtMs(rag.embedP50Ms)}</dd>
            </div>
            <div>
              <dt>Rerank P50</dt>
              <dd>{fmtMs(rag.rerankP50Ms)}</dd>
            </div>
            <div>
              <dt>Context size</dt>
              <dd>{fmtNum(rag.contextSize)}</dd>
            </div>
            <div>
              <dt>Hit rate</dt>
              <dd>{rag.hitRate != null ? `${rag.hitRate}%` : "—"}</dd>
            </div>
          </dl>
        </Panel>
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
