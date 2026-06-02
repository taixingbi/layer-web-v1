/**
 * Article body: HuntAI Grafana Cloud observability stack.
 */

import Link from "next/link";

import { BlogPre } from "@/components/blog/BlogPre";
import { blogPostPath } from "@/lib/blog-posts";

const GRAFANA_STACK = "https://taixingbi.grafana.net";

const REPOS = {
  k3s: "https://github.com/taixingbi/huntai-k3s",
  observability: "https://github.com/taixingbi/layer-observability-grafana",
  prometheusManifest:
    "https://github.com/taixingbi/huntai-k3s/blob/main/manifests/observability/prometheus-grafana.yaml",
  alloyManifest:
    "https://github.com/taixingbi/huntai-k3s/blob/main/manifests/observability/alloy-loki-cloud.yaml",
  grafanaImport:
    "https://github.com/taixingbi/huntai-k3s/tree/main/grafana-import",
  deployPrometheus:
    "https://github.com/taixingbi/huntai-k3s/blob/main/docs/deploy-prometheus.md",
  deployAlloy: "https://github.com/taixingbi/huntai-k3s/blob/main/docs/deploy-alloy-loki.md",
} as const;

/** Example LogQL for Explore (not inline in JSX — avoids brace parse issues). */
const TRACE_LOGQL_EXAMPLE = '|= "tr_abc123"';

export function GrafanaObservabilityArticle() {
  return (
    <article className="blog-article">
      <header className="blog-article-header">
        <p className="blog-eyebrow">Production engineering · HuntAI platform</p>
        <h1>Observability with Grafana Cloud: Metrics, Logs, and Dashboards</h1>
        <p className="blog-lede">
          HuntAI does not run Grafana inside the k3s cluster. Prometheus scrapes workloads locally,
          Alloy ships JSON logs to Loki, and everything lands in Grafana Cloud—where dashboards,
          alerts, and one-click trace lookup from the web UI tie a slow answer back to GPU, gateway,
          and orchestrator signals.
        </p>
      </header>

      <section>
        <h2>The stack at a glance</h2>
        <BlogPre title="Observability path">
          {`
HuntAI services (stdout JSON logs + GET /metrics)
        │
        ├─► Prometheus (namespace: monitoring)
        │      kubernetes_sd + static GPU targets
        │      remote_write → Grafana Cloud Mimir/Prometheus
        │
        └─► Grafana Alloy DaemonSet (alloy-logs)
               tail pod logs → parse JSON
               loki.write → Grafana Cloud Loki

Grafana Cloud (taixingbi.grafana.net)
        │
        ├── Dashboards (imported JSON)
        ├── Explore (LogQL / PromQL)
        └── Alerts (Prometheus + Loki rules)

layer-web-v1 debug panel → Grafana Explore (trace_id)
`.trim()}
        </BlogPre>
        <p>
          Stack home:{" "}
          <a href={GRAFANA_STACK} target="_blank" rel="noopener noreferrer">
            taixingbi.grafana.net
          </a>
          . Manifests and dashboards live in{" "}
          <a href={REPOS.k3s} target="_blank" rel="noopener noreferrer">
            huntai-k3s
          </a>
          ; upstream dashboard sources are mirrored from{" "}
          <a href={REPOS.observability} target="_blank" rel="noopener noreferrer">
            layer-observability-grafana
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Metrics: in-cluster Prometheus</h2>
        <p>
          <a href={REPOS.prometheusManifest} target="_blank" rel="noopener noreferrer">
            prometheus-grafana.yaml
          </a>{" "}
          deploys Prometheus with a 15s scrape interval, 15-day local TSDB on{" "}
          <code>local-path</code> PVC, and <strong>remote_write</strong> to Grafana Cloud. Services
          do not push metrics themselves—they expose <code>GET /metrics</code> and Prometheus
          discovers them.
        </p>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>workload label</th>
                <th>What it scrapes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>inference</code>
                </td>
                <td>vLLM chat Service <code>vllm-inference</code> (namespace ai)</td>
              </tr>
              <tr>
                <td>
                  <code>gateway-inference</code>
                </td>
                <td>layer-gateway-inference-v1</td>
              </tr>
              <tr>
                <td>
                  <code>gateway-embedding</code>
                </td>
                <td>layer-gateway-embed-v1</td>
              </tr>
              <tr>
                <td>
                  <code>gateway-api</code>
                </td>
                <td>layer-gateway-api-v1 (edge BFF)</td>
              </tr>
              <tr>
                <td>
                  <code>rag-query</code>
                </td>
                <td>layer-rag-query-v1</td>
              </tr>
              <tr>
                <td>
                  <code>embedding</code> / <code>reranker</code>
                </td>
                <td>Static targets on GPU nodes (:8001 / :8002)</td>
              </tr>
              <tr>
                <td>
                  <code>gpu-telemetry</code>
                </td>
                <td>DCGM exporter (gpu-operator)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Filter every panel with <code>workload=...</code> and <code>cluster=k3s</code> (external
          label on remote_write). Deploy:{" "}
          <a href={REPOS.deployPrometheus} target="_blank" rel="noopener noreferrer">
            deploy-prometheus.md
          </a>
          —patch Secret <code>prometheus-grafana-cloud-remote-write</code> with a{" "}
          <code>metrics:write</code> token, then rollout restart Prometheus.
        </p>
      </section>

      <section>
        <h2>Logs: Alloy → Grafana Cloud Loki</h2>
        <p>
          Every HuntAI FastAPI service logs structured JSON to stderr (
          <code>request_id</code>, <code>trace_id</code>, <code>event</code>, <code>latency_ms</code>
          ). No in-process Loki client—the{" "}
          <a href={REPOS.alloyManifest} target="_blank" rel="noopener noreferrer">
            Alloy DaemonSet
          </a>{" "}
          tails container logs via the Kubernetes API, parses CRI + JSON, and forwards with{" "}
          <code>loki.write</code>.
        </p>
        <BlogPre title="Deploy pattern">
          {`
kubectl apply -f manifests/observability/alloy-loki-cloud.yaml

# Patch Secret alloy-grafana-cloud-loki:
#   loki-url, loki-username, api-key (logs:write)

kubectl rollout restart daemonset/alloy-logs -n monitoring
`.trim()}
        </BlogPre>
        <p>
          If Loki credentials are wrong, Alloy may report <code>loki.write</code> unhealthy—fix the
          secret rather than crash-looping the cluster. See{" "}
          <a href={REPOS.deployAlloy} target="_blank" rel="noopener noreferrer">
            deploy-alloy-loki.md
          </a>
          .
        </p>
      </section>

      <section>
        <h2>End-to-end trace debugging</h2>
        <p>
          Correlation IDs are the join key across metrics and logs. A single user question propagates{" "}
          <code>X-Trace-Id</code> from the web BFF through the orchestrator, RAG, gateways, and vLLM.
        </p>
        <BlogPre title="Debug flow">
          {`
User slow answer in layer-web-v1
   │
   ▼
Copy trace_id from Details → Trace tab
   │
   ├─► LangSmith (optional LLM run search)
   │
   └─► Grafana Explore → Loki
          LogQL: |= "<trace_id>"
          (last 24h)

See request_received → route → proxy_response
across orchestrator, RAG, inference gateway
`.trim()}
        </BlogPre>
        <p>
          Example LogQL fragment: <code>{TRACE_LOGQL_EXAMPLE}</code>. The web app builds an Explore
          URL automatically via <code>NEXT_PUBLIC_GRAFANA_BASE_URL</code> (default{" "}
          <code>taixingbi.grafana.net</code>) and optional{" "}
          <code>NEXT_PUBLIC_GRAFANA_LOKI_DATASOURCE</code>.
        </p>
      </section>

      <section>
        <h2>Dashboards and alerts</h2>
        <p>
          Import JSON from{" "}
          <a href={REPOS.grafanaImport} target="_blank" rel="noopener noreferrer">
            huntai-k3s/grafana-import
          </a>
          :
        </p>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>Dashboard</th>
                <th>Focus</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>inference.json</code>
                </td>
                <td>vLLM / chat inference latency and throughput</td>
              </tr>
              <tr>
                <td>
                  <code>embedding.json</code>
                </td>
                <td>Embed model on GPU nodes</td>
              </tr>
              <tr>
                <td>
                  <code>gpu.json</code>
                </td>
                <td>DCGM utilization, memory, temperature</td>
              </tr>
              <tr>
                <td>
                  <code>reranker.json</code>
                </td>
                <td>Cross-encoder rerank path</td>
              </tr>
              <tr>
                <td>
                  <code>loki-logs-http.json</code>
                </td>
                <td>JSON log volume, 4xx/5xx, p95 routes (Loki)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Alert rules ship alongside dashboards:</p>
        <ul className="blog-list-check">
          <li>
            <code>prometheus-alert-rules.yaml</code> — latency, error rate, GPU pressure (import as
            Prometheus/Mimir rules)
          </li>
          <li>
            <code>loki-gateway-log-level-alerts.yaml</code> — WARN/ERROR spikes on gateway JSON logs
            (Grafana-managed Loki alerts)
          </li>
        </ul>
        <p>
          After import, map datasource UIDs to your Grafana Cloud Prometheus and Loki instances.
          Panel queries may reference <code>service=</code> labels—align with your{" "}
          <code>workload=</code> scrape labels if panels look empty.
        </p>
      </section>

      <section>
        <h2>What each signal is for</h2>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>Signal</th>
                <th>Question it answers</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Prometheus / GPU dashboard</td>
                <td>Are GPUs saturated? Which node is hot?</td>
              </tr>
              <tr>
                <td>gateway-inference metrics</td>
                <td>Queue depth, backend inflight, circuit opens?</td>
              </tr>
              <tr>
                <td>rag-query metrics</td>
                <td>Retrieve vs chat phase latency at the service?</td>
              </tr>
              <tr>
                <td>Loki logs by trace_id</td>
                <td>Why did this one request fail or slow down?</td>
              </tr>
              <tr>
                <td>LangSmith (optional)</td>
                <td>Prompt-level LLM trace for router/RAG experiments</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Design choices</h2>
        <ul className="blog-list-check">
          <li>
            <strong>Grafana Cloud, not in-cluster Grafana</strong> — less ops on the homelab; SSO and
            long retention handled by the vendor
          </li>
          <li>
            <strong>No high-cardinality trace IDs in metric labels</strong> — keeps Prometheus cost
            stable; use Loki for per-request lookup
          </li>
          <li>
            <strong>Structured JSON everywhere</strong> — Alloy can extract fields; LogQL can filter
            on <code>level</code> and route without regex hell
          </li>
          <li>
            <strong>Debug links in the product</strong> — engineers jump from chat UI to Grafana
            without rebuilding URLs by hand
          </li>
        </ul>
      </section>

      <section>
        <h2>Related reading</h2>
        <ul className="blog-link-list">
          <li>
            <Link href={blogPostPath("building-an-ai-orchestrator")} className="blog-inline-link">
              Inside HuntAI&apos;s Orchestrator
            </Link>
            {" — correlation IDs and nested latency_ms"}
          </li>
          <li>
            <Link href={blogPostPath("layer-gateway-inference-design")} className="blog-inline-link">
              GPU-Aware Inference Routing
            </Link>
            {" — gateway_requests_total, queue metrics"}
          </li>
          <li>
            <Link href={blogPostPath("layer-rag-query-design")} className="blog-inline-link">
              Hybrid RAG in Production
            </Link>
            {" — rag_query_* histograms and phased logs"}
          </li>
        </ul>
      </section>

      <section>
        <h2>Repository</h2>
        <ul className="blog-link-list">
          <li>
            <a href={REPOS.k3s} target="_blank" rel="noopener noreferrer">
              huntai-k3s
            </a>
            {" — Prometheus, Alloy manifests, grafana-import/"}
          </li>
          <li>
            <a href={REPOS.observability} target="_blank" rel="noopener noreferrer">
              layer-observability-grafana
            </a>
            {" — upstream dashboard JSON"}
          </li>
        </ul>
      </section>

      <section>
        <h2>Closing</h2>
        <p>
          Production AI platforms fail in distributed ways—a router timeout, a full GPU queue, a RAG
          rerank spike. HuntAI&apos;s observability story is built so one <code>trace_id</code> connects
          metrics on Grafana dashboards to JSON lines in Loki, with the same ID surfaced in the chat
          UI.
        </p>
        <p className="blog-closing">Scrape locally. Store in Grafana Cloud. Debug by trace_id.</p>
      </section>
    </article>
  );
}
