/**
 * Article body: layer-gateway-inference-v1 production design deep-dive.
 */

import Link from "next/link";

import { BlogPre } from "@/components/blog/BlogPre";
import { blogPostPath } from "@/lib/blog-posts";

const REPOS = {
  inference: "https://github.com/taixingbi/layer-gateway-inference-v1",
  orchestrator: "https://github.com/taixingbi/layer-orchestrator-v1",
  k3s: "https://github.com/taixingbi/huntai-k3s",
  deploy: "https://github.com/taixingbi/huntai-k3s/blob/main/docs/deploy-gateway-inference.md",
  architecture:
    "https://github.com/taixingbi/layer-gateway-inference-v1/blob/main/docs/artichecture.md",
} as const;

/** Prometheus metric name (braces in a module string — not inline in JSX). */
const OPENAI_FALLBACK_METRIC = "gateway_fallback_requests_total{provider=\"openai\"}";

const SFT_LORA_ID = "router-qwen2.5-7b-sft-v1.00";
const DPO_LORA_ID = "router-qwen2.5-7b-dpo-v1.00";

export function InferenceGatewayArticle() {
  return (
    <article className="blog-article">
      <header className="blog-article-header">
        <p className="blog-eyebrow">Production engineering · HuntAI platform</p>
        <h1>GPU-Aware Inference Routing: Inside layer-gateway-inference-v1</h1>
        <p className="blog-lede">
          HuntAI does not send chat completions to a single vLLM pod behind a Kubernetes Service.
          Requests pass through a FastAPI gateway that schedules per-request across a GPU backend pool—with
          load-aware scoring, admission control, circuit breakers, and structured traces on every hop.
        </p>
      </header>

      <section>
        <h2>The system at a glance</h2>
        <p>
          The inference gateway sits between upstream callers (primarily{" "}
          <code>layer-orchestrator-v1</code>) and multiple vLLM instances on GPU nodes. Kubernetes
          still owns pod lifecycle; the gateway owns routing decisions.
        </p>
        <BlogPre title="Inference path in HuntAI">
          {`
layer-orchestrator-v1
        │
        │  POST /v1/chat/completions
        │  X-Request-Id, X-Trace-Id, X-Session-Id
        ▼
layer-gateway-inference-v1
        │
        ├── classify (small / medium / large / streaming_long)
        ├── admission queue
        ├── score backends → pick lowest
        └── proxy (stream or JSON)
        │
        ├──────────────┬──────────────┐
        ▼              ▼              ▼
   gpu-node-1     gpu-node-2    (optional OpenAI fallback)
   vLLM :8000     vLLM :8000
   Qwen2.5-7B     Qwen2.5-7B
   + LoRA routers
`.trim()}
        </BlogPre>
      </section>

      <section>
        <h2>Why a Kubernetes Service is not enough</h2>
        <p>
          Default kube-proxy routing is <strong>connection-level</strong>: one TCP connection can stick
          to one GPU node while others sit idle. vLLM inference needs <strong>request-level</strong>,
          load-aware distribution so continuous batching stays balanced.
        </p>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>Capability</th>
                <th>k3s Service</th>
                <th>layer-gateway-inference-v1</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Routing granularity</td>
                <td>Per connection</td>
                <td>Per request</td>
              </tr>
              <tr>
                <td>Load awareness</td>
                <td>None</td>
                <td>Inflight, latency EWMAs, error rate</td>
              </tr>
              <tr>
                <td>Circuit breaker</td>
                <td>No</td>
                <td>Per-backend open / half-open / closed</td>
              </tr>
              <tr>
                <td>Retry on 502/503/504</td>
                <td>No</td>
                <td>Yes, alternate backend</td>
              </tr>
              <tr>
                <td>Queue backpressure</td>
                <td>No</td>
                <td>Bounded FIFO + max age</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The gateway does not replace vLLM batching—it chooses <em>which</em> backend receives each
          request so GPU utilization and p95 latency improve without changing the model server.
        </p>
      </section>

      <section>
        <h2>Gateway components</h2>
        <p>
          <code>layer-gateway-inference-v1</code> is a single stateless FastAPI process with internal
          subsystems defined in{" "}
          <a href={REPOS.architecture} target="_blank" rel="noopener noreferrer">
            docs/artichecture.md
          </a>
          :
        </p>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Responsibility</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>app/api/routes.py</code>
                </td>
                <td>OpenAI-compatible <code>POST /v1/chat/completions</code>, health, ready, metrics</td>
              </tr>
              <tr>
                <td>
                  <code>app/queue/admission_queue.py</code>
                </td>
                <td>Bounded FIFO; absorbs spikes; rejects when full or aged out</td>
              </tr>
              <tr>
                <td>
                  <code>app/scheduler/dispatcher.py</code>
                </td>
                <td>Periodic tick; pops batch; assigns backend via scoring</td>
              </tr>
              <tr>
                <td>
                  <code>app/scheduler/scoring.py</code>
                </td>
                <td>Weighted cost function; lowest score wins</td>
              </tr>
              <tr>
                <td>
                  <code>app/backends/state.py</code>
                </td>
                <td>Per-GPU inflight, EWMA latency, circuit state, drain flag</td>
              </tr>
              <tr>
                <td>
                  <code>app/proxy/client.py</code>
                </td>
                <td>Upstream proxy, streaming, retries, health signal updates</td>
              </tr>
              <tr>
                <td>
                  <code>app/metrics/prometheus.py</code>
                </td>
                <td>
                  <code>gateway_requests_total</code>, queue depth, backend load gauges
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>End-to-end request lifecycle</h2>
        <BlogPre title="Dispatch flow">
          {`
Client POST /v1/chat/completions
   │
   ▼
Validate payload + classify request class
   │
   ▼
Enqueue (AdmissionQueue)
   │
   ▼
Scheduler tick → filter eligible backends
   │                (not drained, circuit closed, under hard_limit)
   ▼
score_backend() for each → pick_backend() (min score)
   │
   ▼
Proxy → vLLM backend URL from config.yaml
   │
   ├── success → stream/JSON response + latency EWMA update
   └── failure → retry alternate backend (max_attempts) or 5xx
`.trim()}
        </BlogPre>
        <p>
          Correlation headers from the orchestrator flow through unchanged when present:{" "}
          <code>X-Request-Id</code>, <code>X-Trace-Id</code>, <code>X-Session-Id</code>. The gateway
          generates a <code>request_id</code> only when the client omits it. Structured JSON logs on
          stdout include <code>event</code>, <code>backend</code>, <code>latency_ms</code>, and trace
          fields for Loki/Grafana pipelines—no in-process Loki client required.
        </p>
      </section>

      <section>
        <h2>Load-aware scoring</h2>
        <p>
          Each backend accumulates runtime signals. The scheduler computes a weighted score; the lowest
          score receives the next request. Production weights from <code>config.yaml</code>:
        </p>
        <BlogPre title="Score function (simplified)">
          {`
score =
    inflight × 8.0
  + queue_ewma × 0.04
  + ttft_ewma × 0.03
  + e2e_ewma × 0.02
  + error_rate × 100.0
  + hot_spot_penalty
  + overload_penalty (inflight > soft_limit)
  + class_penalty (small jobs avoid backends with large work)
`.trim()}
        </BlogPre>
        <p>
          Backends declare <code>soft_limit</code> and <code>hard_limit</code> inflight caps (e.g. 20 /
          28 per GPU node). The overload penalty steers traffic before the hard cap is hit; the hot-spot
          penalty prevents one node from taking more than ~55% of dispatches in a short window.
        </p>
      </section>

      <section>
        <h2>Request classification</h2>
        <p>
          Before scoring, the gateway classifies each chat body heuristically (character-based token
          estimate, not a full tokenizer):
        </p>
        <BlogPre>{`
small_chat       — total_est < 1500 tokens
medium_chat      — 1500 ≤ total_est ≤ 4000
large_chat       — total_est > 4000
streaming_long   — stream=true and total_est > 4000
`.trim()}
        </BlogPre>
        <p>
          Small and medium requests receive a penalty when targeting a backend that already holds large
          inflight work—reducing head-of-line blocking for short router calls vs. long RAG generations.
        </p>
      </section>

      <section>
        <h2>Reliability: queue, circuit breaker, retry</h2>

        <h3>Admission queue</h3>
        <p>
          Default policy: max <strong>500</strong> queued requests, max age <strong>2000 ms</strong>.
          Exceeding either returns a gateway rejection with a tracked reason (
          <code>queue_full</code>, <code>queue_age</code>) rather than wedging the process.
        </p>

        <h3>Circuit breaker</h3>
        <BlogPre>{`
closed ──(5 consecutive failures)──► open
open ──(cooldown 15s)──► half_open ──(probe success)──► closed
                      └──(probe fail)──► open
`.trim()}
        </BlogPre>

        <h3>Retry</h3>
        <p>
          Up to <strong>2</strong> attempts on <code>502</code>, <code>503</code>, <code>504</code>, or
          transport errors, with best-effort failover to a different backend.
        </p>
      </section>

      <section>
        <h2>Observability trace</h2>
        <BlogPre title="Correlation through the inference hop">
          {`
request_id (per HTTP call)
   │
trace_id ──────► Grafana Loki / LangSmith (from orchestrator)
   │
   ├─► gateway log: request_received
   ├─► gateway log: request_dispatched (backend=gpu-node-1)
   ├─► gateway log: proxy_start
   ├─► gateway log: stream_first_byte  (streaming)
   └─► gateway log: proxy_response (latency_ms, status_code)

Prometheus: GET /metrics on gateway pod
`.trim()}
        </BlogPre>
        <p>
          High-cardinality IDs are kept in logs, not Prometheus labels—avoiding metric explosion while
          still allowing trace_id lookup in Loki. Deploy and dashboards:{" "}
          <Link href={blogPostPath("grafana-observability")} className="blog-inline-link">
            Observability with Grafana Cloud
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>OpenAI overload fallback</h2>
        <p>
          When GPU backends are saturated or unavailable, the gateway can route to OpenAI (
          <code>gpt-4o-mini</code> by default) if <code>openai_fallback.enabled</code> is true in{" "}
          <code>config.yaml</code>. Dispatch logs include{" "}
          <code>gateway_meta.reason</code>:
        </p>
        <BlogPre>{`
queue_full_fallback   — admission queue at capacity
queue_age_fallback    — dispatch exceeded queue_max_age_ms
no_backend_fallback   — no eligible GPU backend (ScheduleError)
`.trim()}
        </BlogPre>
        <p>
          Metric <code>{OPENAI_FALLBACK_METRIC}</code> increments on
          each fallback dispatch. In HuntAI dev, fallback is typically disabled; GPU routing is the hot
          path.
        </p>
      </section>

      <section>
        <h2>Backend configuration</h2>
        <p>
          Backends are explicit URLs in mounted <code>config.yaml</code>—usually NodePort endpoints to
          vLLM on each GPU machine:
        </p>
        <BlogPre title="config.yaml (excerpt)">
          {`
backends:
  - name: gpu-node-1
    url: http://192.168.86.173:30080
    soft_limit: 20
    hard_limit: 28
  - name: gpu-node-2
    url: http://192.168.86.176:30080
    soft_limit: 20
    hard_limit: 28

health:
  consecutive_failures_open: 5
  open_cooldown_ms: 15000

retry:
  max_attempts: 2
  retryable_statuses: [502, 503, 504]
`.trim()}
        </BlogPre>
        <p>
          Router LoRA adapters (<code>router-qwen2.5-7b-sft-v1.00</code>,{" "}
          <code>router-qwen2.5-7b-dpo-v1.00</code>) and the base{" "}
          <code>Qwen/Qwen2.5-7B-Instruct</code> model are served by the same vLLM fleet; the orchestrator
          selects the model name per call.
        </p>
      </section>

      <section>
        <h2>Deployment on k3s</h2>
        <BlogPre title="GitOps delivery">
          {`
GitHub push (layer-gateway-inference-v1 main)
   │
   ▼
Docker Hub: taixingbi/layer-gateway-inference-v1:<sha>
   │
   ▼
huntai-k3s manifest pin → Argo CD (gateway-inference-dev)
   │
   ▼
k3s namespace ai-dev
   │
   ├── Deployment: layer-gateway-inference
   ├── Service (in-cluster :8000, NodePort 30180 dev)
   └── config.yaml ConfigMap mount + OPENAI_API_KEY secret
`.trim()}
        </BlogPre>
        <p>
          <code>GET /ready</code> probes each configured vLLM <code>GET /health</code> before the pod is
          marked ready. The orchestrator&apos;s own <code>/ready</code> checks this gateway, so a dead
          inference tier blocks new chat traffic upstream. Deploy steps:{" "}
          <a href={REPOS.deploy} target="_blank" rel="noopener noreferrer">
            huntai-k3s deploy-gateway-inference.md
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Design principles</h2>
        <ul className="blog-list-check">
          <li>
            <strong>Separate concerns</strong> — Kubernetes schedules pods; gateway routes requests; vLLM
            batches on GPU
          </li>
          <li>
            <strong>Stay lightweight</strong> — no duplicate of vLLM&apos;s continuous batching; only
            routing intelligence
          </li>
          <li>
            <strong>Optimize for GPU pressure</strong> — inflight, latency EWMAs, and request class—not
            CPU on the gateway host
          </li>
          <li>
            <strong>Fail visibly</strong> — queue rejections, circuit opens, and fallback reasons are
            logged and metered
          </li>
        </ul>
      </section>

      <section>
        <h2>Related reading</h2>
        <p>
          The inference gateway is one hop in the full HuntAI path. For rewrite, route classification,
          RAG, and SSE aggregation, see{" "}
          <Link href={blogPostPath("building-an-ai-orchestrator")} className="blog-inline-link">
            From Prompt to Response: Inside HuntAI&apos;s Orchestrator
          </Link>
          .
        </p>
        <p>
          Router LoRA adapters ({SFT_LORA_ID}, {DPO_LORA_ID}) are trained and evaluated separately—see{" "}
          <Link href={blogPostPath("router-sft-dpo-training")} className="blog-inline-link">
            Training the HuntAI Router: SFT, DPO, and Golden Eval
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>Repository</h2>
        <ul className="blog-link-list">
          <li>
            <a href={REPOS.inference} target="_blank" rel="noopener noreferrer">
              layer-gateway-inference-v1
            </a>
            {" — gateway source, config, metrics, proxy"}
          </li>
          <li>
            <a href={REPOS.k3s} target="_blank" rel="noopener noreferrer">
              huntai-k3s
            </a>
            {" — manifests, Argo CD apps, smoke tests"}
          </li>
        </ul>
      </section>

      <section>
        <h2>Closing</h2>
        <p>
          Production LLM platforms need more than a model server—they need a routing layer that
          understands GPU load. <code>layer-gateway-inference-v1</code> is HuntAI&apos;s answer: request-level
          scheduling, measurable backpressure, and traces that make slow generations diagnosable.
        </p>
        <p className="blog-closing">Route per request. Measure every backend. Keep vLLM batching on the GPU.</p>
      </section>
    </article>
  );
}
