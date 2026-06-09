import Link from "next/link";

import { blogPostPath } from "@/lib/blog-posts";
import type { TrainMethod } from "@/lib/train/products";
import {
  ROUTER_DEFAULT_BASE_MODEL,
  ROUTER_DEFAULT_PROMPT_VERSION,
  ROUTER_DPO_LORA_ID,
  ROUTER_PIPELINE_ASCII,
  ROUTER_SFT_LORA_ID,
  ROUTER_TRAIN_REPOS,
} from "@/lib/train/router-constants";

import { RouterMethodTabs } from "./RouterMethodTabs";

type Props = {
  method: TrainMethod;
};

function CommandBlock({ title, children }: { title: string; children: string }) {
  return (
    <div className="train-command-block">
      <div className="train-command-title">{title}</div>
      <pre className="admin-code">{children}</pre>
    </div>
  );
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a href={href} target="_blank" rel="noopener noreferrer" className="train-external-link">
        {label} ↗
      </a>
    </li>
  );
}

export function RouterTrainPanel({ method }: Props) {
  const loraId = method === "sft" ? ROUTER_SFT_LORA_ID : ROUTER_DPO_LORA_ID;
  const datasetUrl = method === "sft" ? ROUTER_TRAIN_REPOS.sftDataset : ROUTER_TRAIN_REPOS.dpoDataset;

  return (
    <div className="train-dashboard admin-dashboard">
      <RouterMethodTabs active={method} />

      <section className="admin-panel admin-panel--full">
        <h2 className="admin-panel-title">Pipeline</h2>
        <pre className="admin-code train-pipeline-pre">{ROUTER_PIPELINE_ASCII}</pre>
      </section>

      <div className="admin-row admin-row--half">
        <section className="admin-panel">
          <h2 className="admin-panel-title">{method.toUpperCase()} workflow</h2>
          {method === "sft" ? (
            <>
              <p className="admin-muted">
                Build gold completions only (no rejected pairs), then QLoRA SFT on GPU.
              </p>
              <CommandBlock title="1. Build JSONL">{`python -m app.build sft`}</CommandBlock>
              <CommandBlock title="2. Train (local or EC2)">{`python -m app.train.main --method sft`}</CommandBlock>
              <CommandBlock title="3. Golden eval">{`ROUTER_MODEL=${loraId} \\
  ROUTER_PROMPT_VERSION=${ROUTER_DEFAULT_PROMPT_VERSION} \\
  python -m app.eval \\
  --result-dir data/golden-test/result/sft-v1.00`}</CommandBlock>
            </>
          ) : (
            <>
              <p className="admin-muted">
                Build chosen/rejected pairs from gold + eval mismatches, then QLoRA DPO.
              </p>
              <CommandBlock title="1. Eval then build">{`ROUTER_PROMPT_VERSION=${ROUTER_DEFAULT_PROMPT_VERSION} python -m app.eval
python -m app.build dpo`}</CommandBlock>
              <CommandBlock title="2. Train">{`python -m app.train.main --method dpo`}</CommandBlock>
              <CommandBlock title="3. Golden eval">{`ROUTER_MODEL=${loraId} \\
  ROUTER_PROMPT_VERSION=${ROUTER_DEFAULT_PROMPT_VERSION} \\
  python -m app.eval \\
  --result-dir data/golden-test/result/dpo-v1.00`}</CommandBlock>
            </>
          )}
        </section>

        <section className="admin-panel">
          <h2 className="admin-panel-title">Deploy &amp; defaults</h2>
          <ul className="admin-kv-list">
            <li className="admin-kv-row">
              <span className="admin-kv-key">Base model</span>
              <span className="admin-kv-val train-kv-mono">{ROUTER_DEFAULT_BASE_MODEL}</span>
            </li>
            <li className="admin-kv-row">
              <span className="admin-kv-key">LoRA id</span>
              <span className="admin-kv-val train-kv-mono">{loraId}</span>
            </li>
            <li className="admin-kv-row">
              <span className="admin-kv-key">Prompt</span>
              <span className="admin-kv-val train-kv-mono">{ROUTER_DEFAULT_PROMPT_VERSION}</span>
            </li>
            <li className="admin-kv-row">
              <span className="admin-kv-key">EC2 method</span>
              <span className="admin-kv-val train-kv-mono">TRAIN_METHOD={method}</span>
            </li>
          </ul>
          <CommandBlock title="EC2 deploy (GitHub Actions)">{`# Repo var TRAIN_METHOD=${method}
# Commit data/output/${method}/train.jsonl before push
# Workflow: deploy.yml → S3 → EC2 SSM → app.train.main`}</CommandBlock>
        </section>
      </div>

      <div className="admin-row admin-row--half">
        <section className="admin-panel">
          <h2 className="admin-panel-title">Repositories &amp; data</h2>
          <ul className="train-link-list">
            <LinkRow href={ROUTER_TRAIN_REPOS.train} label="layer-router-train-v1" />
            <LinkRow href={ROUTER_TRAIN_REPOS.orchestrator} label="layer-orchestrator-v1" />
            <LinkRow href={ROUTER_TRAIN_REPOS.goldenTest} label="Golden test CSVs" />
            <LinkRow href={datasetUrl} label={`Dataset (${method})`} />
            <LinkRow href={ROUTER_TRAIN_REPOS.deployWorkflow} label="deploy.yml workflow" />
            <LinkRow href={ROUTER_TRAIN_REPOS.vllmDeploy} label="vLLM LoRA deploy guide" />
          </ul>
        </section>

        <section className="admin-panel">
          <h2 className="admin-panel-title">Related</h2>
          <ul className="train-link-list">
            <li>
              <Link href={blogPostPath("router-sft-dpo-training")} className="train-external-link">
                Blog: Router SFT / DPO training →
              </Link>
            </li>
            <li>
              <Link href="/admin" className="train-external-link">
                Admin dashboard (router accuracy &amp; routes) →
              </Link>
            </li>
          </ul>
          <p className="admin-muted train-footnote">
            Gold CSVs auto-download from orchestrator GitHub when missing. Training JSONL is synced to
            EC2 via S3 (<code>data/output/{method}/</code>).
          </p>
        </section>
      </div>
    </div>
  );
}
