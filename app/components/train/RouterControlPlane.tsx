"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { blogPostPath } from "@/lib/blog-posts";
import { authFetchWithTimeout } from "@/lib/auth-fetch";
import type { ParsedEvalReport } from "@/lib/train/parse-eval-report";
import type { TrainMethod } from "@/lib/train/products";
import {
  ROUTER_DEFAULT_PROMPT_VERSION,
  ROUTER_DPO_LORA_ID,
  ROUTER_SFT_LORA_ID,
  ROUTER_TRAIN_REPOS,
} from "@/lib/train/router-constants";
import type { RouterOverviewPayload } from "@/lib/train/router-overview";
import { webApiPaths } from "@/lib/web-api-paths";

import { RouterMethodTabs } from "./RouterMethodTabs";

type Props = {
  method: TrainMethod;
};

function relTime(iso: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso.replace(" ", "T"));
  if (Number.isNaN(t)) return iso.slice(0, 10);
  const h = Math.round((Date.now() - t) / 3_600_000);
  if (h < 1) return "<1h ago";
  if (h < 48) return `${h}h ago`;
  return iso.slice(0, 10);
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="train-kpi">
      <div className="train-kpi-label">{label}</div>
      <div className="train-kpi-value">{value}</div>
      {sub ? <div className="train-kpi-sub">{sub}</div> : null}
    </div>
  );
}

function AccuracyBar({ label, pct, highlight }: { label: string; pct: number; highlight?: boolean }) {
  return (
    <div className={`train-acc-row${highlight ? " train-acc-row--highlight" : ""}`}>
      <div className="train-acc-meta">
        <span className="train-acc-label">{label}</span>
        <span className="train-acc-pct">{pct.toFixed(1)}%</span>
      </div>
      <div className="train-acc-track">
        <div className="train-acc-fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function RouteBars({ rows }: { rows: ParsedEvalReport["routeRows"] }) {
  const sorted = [...rows].sort((a, b) => b.pct - a.pct);
  return (
    <ul className="train-route-bars">
      {sorted.map((r) => (
        <li key={r.route} className="train-route-row">
          <span className="train-route-name">{r.route}</span>
          <div className="train-route-track">
            <div className="train-route-fill" style={{ width: `${r.pct}%` }} />
          </div>
          <span className="train-route-pct">{r.pct.toFixed(0)}%</span>
        </li>
      ))}
    </ul>
  );
}

function CommandBlock({ title, children }: { title: string; children: string }) {
  return (
    <div className="train-command-block">
      <div className="train-command-title">{title}</div>
      <pre className="admin-code">{children}</pre>
    </div>
  );
}

const PIPELINE = [
  { title: "Gold CSVs", sub: "question, expected_route" },
  { title: "Dataset Builder", sub: "train.jsonl / val.jsonl" },
  { title: "QLoRA SFT", sub: ROUTER_SFT_LORA_ID },
  { title: "QLoRA DPO", sub: ROUTER_DPO_LORA_ID },
  { title: "Golden Eval", sub: "accuracy / failures" },
  { title: "Deploy", sub: "Orchestrator + vLLM LoRA" },
];

export function RouterControlPlane({ method }: Props) {
  const [data, setData] = useState<RouterOverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authFetchWithTimeout(webApiPaths.train.routerOverview);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setData((await res.json()) as RouterOverviewPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="admin-alert">
        <p>{error}</p>
        <button type="button" className="admin-btn-secondary" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="admin-muted">Loading router metrics…</p>;
  }

  const activeEval = method === "sft" ? data.evals.sft : data.evals.dpo;
  const activeDataset = method === "sft" ? data.datasets.sft : data.datasets.dpo;
  const loraId = method === "sft" ? ROUTER_SFT_LORA_ID : ROUTER_DPO_LORA_ID;
  const datasetUrl = method === "sft" ? ROUTER_TRAIN_REPOS.sftDataset : ROUTER_TRAIN_REPOS.dpoDataset;

  return (
    <div className="train-control-plane admin-dashboard">
      <section className="train-prod-banner admin-panel admin-panel--full">
        <div className="train-prod-head">
          <div>
            <p className="train-prod-eyebrow">Production router</p>
            <h2 className="train-prod-model">{data.production.modelId}</h2>
            <p className="admin-muted">
              Prompt {data.production.promptVersion} · Last eval {relTime(data.production.lastEvalAt)}
              {data.source === "github" ? " · synced from GitHub" : " · cached snapshot"}
            </p>
          </div>
          <a
            href={data.resultTreeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn-secondary"
          >
            Eval results ↗
          </a>
        </div>
        <div className="train-kpi-grid">
          <Kpi label="Accuracy" value={`${data.production.accuracyPct.toFixed(1)}%`} sub={`vs base ${data.production.vsBasePct >= 0 ? "+" : ""}${data.production.vsBasePct}%`} />
          <Kpi label="Gold cases" value={String(data.production.goldCases)} />
          <Kpi label="Failed" value={String(data.production.failed)} />
          <Kpi label="Status" value={data.deployment.status} sub="vLLM LoRA" />
        </div>
      </section>

      <div className="admin-row admin-row--half">
        <section className="admin-panel">
          <h2 className="admin-panel-title">Accuracy trend</h2>
          {data.accuracyTrend.map((row) => (
            <AccuracyBar
              key={row.modelId}
              label={row.label}
              pct={row.accuracyPct}
              highlight={row.modelId === data.production.modelId}
            />
          ))}
        </section>
        <section className="admin-panel">
          <h2 className="admin-panel-title">Current deployment</h2>
          <ul className="admin-kv-list">
            <li className="admin-kv-row">
              <span className="admin-kv-key">Base model</span>
              <span className="admin-kv-val train-kv-mono">{data.deployment.baseModel}</span>
            </li>
            <li className="admin-kv-row">
              <span className="admin-kv-key">Adapter</span>
              <span className="admin-kv-val train-kv-mono">{data.deployment.adapter}</span>
            </li>
            <li className="admin-kv-row">
              <span className="admin-kv-key">Prompt</span>
              <span className="admin-kv-val train-kv-mono">{data.deployment.prompt}</span>
            </li>
          </ul>
          <h3 className="train-subtitle">Traffic split</h3>
          <ul className="train-traffic-list">
            {data.deployment.trafficSplit.map((t) => (
              <li key={t.modelId}>
                <span>{t.label}</span>
                <span>{t.pct}%</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="admin-panel admin-panel--full">
        <h2 className="admin-panel-title">Latest golden eval — production</h2>
        <div className="train-eval-summary">
          <Kpi label="Accuracy" value={`${data.evals.sft.accuracyPct.toFixed(1)}%`} />
          <Kpi label="Correct" value={String(data.evals.sft.correct)} />
          <Kpi label="Incorrect" value={String(data.evals.sft.incorrect)} />
          <Kpi label="Total" value={String(data.evals.sft.total)} />
        </div>
        {data.evals.sft.failures.length > 0 ? (
          <>
            <h3 className="train-subtitle">Top failures</h3>
            <ul className="train-failure-list">
              {data.evals.sft.failures.map((f) => (
                <li key={`${f.source}-${f.question}`}>
                  <span className="train-fail-icon" aria-hidden>
                    ✕
                  </span>
                  <span>
                    <strong>
                      {f.expected}
                    </strong>
                    {" → "}
                    <strong>{f.actual}</strong>
                    <span className="admin-muted"> · {f.question.slice(0, 72)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="admin-muted">No route mismatches on production adapter.</p>
        )}
      </section>

      <section className="admin-panel admin-panel--full">
        <h2 className="admin-panel-title">Gold route coverage</h2>
        <p className="admin-muted">Share of golden-test rows per route (production eval).</p>
        <RouteBars rows={data.evals.sft.routeRows} />
      </section>

      <section className="admin-panel admin-panel--full">
        <h2 className="admin-panel-title">Training pipeline</h2>
        <div className="train-pipeline-flow">
          {PIPELINE.map((step, i) => (
            <div key={step.title} className="train-pipeline-card-wrap">
              <div className="train-pipeline-card">
                <div className="train-pipeline-card-title">{step.title}</div>
                <div className="train-pipeline-card-sub">{step.sub}</div>
              </div>
              {i < PIPELINE.length - 1 ? <div className="train-pipeline-arrow" aria-hidden>↓</div> : null}
            </div>
          ))}
        </div>
      </section>

      <RouterMethodTabs active={method} />

      <div className="admin-row admin-row--half">
        <section className="admin-panel">
          <h2 className="admin-panel-title">{method.toUpperCase()} metrics</h2>
          {method === "sft" ? (
            <ul className="admin-kv-list">
              <li className="admin-kv-row">
                <span className="admin-kv-key">Dataset train rows</span>
                <span className="admin-kv-val">{activeDataset.trainRows}</span>
              </li>
              <li className="admin-kv-row">
                <span className="admin-kv-key">Val rows</span>
                <span className="admin-kv-val">{activeDataset.valRows}</span>
              </li>
              <li className="admin-kv-row">
                <span className="admin-kv-key">Eval accuracy</span>
                <span className="admin-kv-val">{activeEval.accuracyPct.toFixed(1)}%</span>
              </li>
            </ul>
          ) : (
            <ul className="admin-kv-list">
              <li className="admin-kv-row">
                <span className="admin-kv-key">Preference pairs</span>
                <span className="admin-kv-val">{activeDataset.dpoPairs ?? 0}</span>
              </li>
              <li className="admin-kv-row">
                <span className="admin-kv-key">Chosen / rejected</span>
                <span className="admin-kv-val">{activeDataset.dpoPairs ?? 0} each</span>
              </li>
              <li className="admin-kv-row">
                <span className="admin-kv-key">Eval accuracy</span>
                <span className="admin-kv-val">{activeEval.accuracyPct.toFixed(1)}%</span>
              </li>
              <li className="admin-kv-row">
                <span className="admin-kv-key">Rejected source</span>
                <span className="admin-kv-val train-kv-mono">
                  {Object.entries(activeDataset.rejectedSource ?? {})
                    .map(([k, v]) => `${k}:${v}`)
                    .join(" ") || "—"}
                </span>
              </li>
            </ul>
          )}
          {activeEval.failures.length > 0 ? (
            <>
              <h3 className="train-subtitle">{method.toUpperCase()} failures</h3>
              <ul className="train-failure-list">
                {activeEval.failures.map((f) => (
                  <li key={`${method}-${f.source}-${f.question}`}>
                    <span className="train-fail-icon" aria-hidden>
                      ✕
                    </span>
                    <span>
                      {f.expected} → {f.actual}
                      <span className="admin-muted"> · {f.question.slice(0, 60)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section className="admin-panel">
          <h2 className="admin-panel-title">{method.toUpperCase()} workflow</h2>
          {method === "sft" ? (
            <>
              <CommandBlock title="1. Build JSONL">python -m app.build sft</CommandBlock>
              <CommandBlock title="2. Train">python -m app.train.main --method sft</CommandBlock>
              <CommandBlock title="3. Eval">{`ROUTER_MODEL=${loraId} \\
  ROUTER_PROMPT_VERSION=${ROUTER_DEFAULT_PROMPT_VERSION} \\
  python -m app.eval`}</CommandBlock>
            </>
          ) : (
            <>
              <CommandBlock title="1. Eval + build">{`ROUTER_PROMPT_VERSION=${ROUTER_DEFAULT_PROMPT_VERSION} python -m app.eval
python -m app.build dpo`}</CommandBlock>
              <CommandBlock title="2. Train">python -m app.train.main --method dpo</CommandBlock>
              <CommandBlock title="3. Eval">{`ROUTER_MODEL=${loraId} \\
  ROUTER_PROMPT_VERSION=${ROUTER_DEFAULT_PROMPT_VERSION} \\
  python -m app.eval`}</CommandBlock>
            </>
          )}
        </section>
      </div>

      <section className="admin-panel admin-panel--full">
        <h2 className="admin-panel-title">Repositories &amp; docs</h2>
        <ul className="train-link-list train-link-list--inline">
          <li>
            <a href={ROUTER_TRAIN_REPOS.train} target="_blank" rel="noopener noreferrer" className="train-external-link">
              layer-router-train-v1 ↗
            </a>
          </li>
          <li>
            <a href={data.resultTreeUrl} target="_blank" rel="noopener noreferrer" className="train-external-link">
              data/result ↗
            </a>
          </li>
          <li>
            <a href={datasetUrl} target="_blank" rel="noopener noreferrer" className="train-external-link">
              Dataset ({method}) ↗
            </a>
          </li>
          <li>
            <Link href={blogPostPath("router-sft-dpo-training")} className="train-external-link">
              Training blog →
            </Link>
          </li>
          <li>
            <Link href="/admin" className="train-external-link">
              Admin dashboard →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
