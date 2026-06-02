/**
 * Article body: HuntAI production orchestrator engineering deep-dive.
 */

import Link from "next/link";

import { BlogLatencyChart } from "@/components/blog/BlogLatencyChart";
import { BlogPre } from "@/components/blog/BlogPre";

const REPOS = {
  web: "https://github.com/taixingbi/layer-web-v1",
  gateway: "https://github.com/taixingbi/layer-gateway-api-v1",
  orchestrator: "https://github.com/taixingbi/layer-orchestrator-v1",
  rag: "https://github.com/taixingbi/layer-rag-query-v1",
  inference: "https://github.com/taixingbi/layer-gateway-inference-v1",
  reranker: "https://github.com/taixingbi/layer-gateway-reranker-v1",
  embed: "https://github.com/taixingbi/layer-gateway-embed-v1",
  mcpGithub: "https://github.com/taixingbi/layer-mcp-github-v1",
  k3s: "https://github.com/taixingbi/huntai-k3s",
  routerEval: "https://github.com/taixingbi/layer-orchestrator-v1/tree/main/router-eval/golden-test",
} as const;

export function BuildingAiOrchestratorArticle() {
  return (
    <article className="blog-article">
      <header className="blog-article-header">
        <p className="blog-eyebrow">Production engineering · HuntAI platform</p>
        <h1>From Prompt to Response: Inside HuntAI&apos;s Orchestrator</h1>
        <p className="blog-lede">
          HuntAI is not a single LLM call. It is a multi-service platform where every user question
          passes through rewrite, route classification, optional retrieval, and streamed generation—with
          correlation IDs, nested latency, and router evaluation baked in from day one.
        </p>
      </header>

      <section>
        <h2>The system at a glance</h2>
        <p>
          Most readers scan before they read. Here is the full request path before we go deeper into
          any single component.
        </p>
        <BlogPre title="HuntAI request path">
          {`
User
 │
 ▼
layer-web-v1
 │
 ▼
layer-gateway-api-v1
 │
 ▼
layer-orchestrator-v1
 │
 ├── Router (Qwen2.5-7B + LoRA adapters)
 ├── layer-rag-query-v1
 ├── layer-mcp-github-v1
 ├── Web Search (Tavily)
 └── layer-gateway-inference-v1
`.trim()}
        </BlogPre>
        <p>
          The orchestrator is the decision point. It does not generate every answer itself—it selects
          the right backend, forwards correlation headers, aggregates latency, and streams the result
          back through the gateway to the web UI.
        </p>
      </section>

      <section>
        <h2>The HuntAI service stack</h2>
        <p>
          Generic architecture diagrams talk about &ldquo;RAG service&rdquo; and &ldquo;LLM
          service.&rdquo; HuntAI runs as named, independently deployable repos:
        </p>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <a href={REPOS.web} target="_blank" rel="noopener noreferrer">
                    layer-web-v1
                  </a>
                </td>
                <td>Next.js web UI and BFF; SSE client, debug panel, conversation history</td>
              </tr>
              <tr>
                <td>
                  <a href={REPOS.gateway} target="_blank" rel="noopener noreferrer">
                    layer-gateway-api-v1
                  </a>
                </td>
                <td>Public API gateway; auth, session cookies, upstream orchestrator proxy</td>
              </tr>
              <tr>
                <td>
                  <a href={REPOS.orchestrator} target="_blank" rel="noopener noreferrer">
                    layer-orchestrator-v1
                  </a>
                </td>
                <td>Rewrite, route classification, tool dispatch, SSE aggregation</td>
              </tr>
              <tr>
                <td>
                  <a href={REPOS.rag} target="_blank" rel="noopener noreferrer">
                    layer-rag-query-v1
                  </a>
                </td>
                <td>Vector retrieval against private knowledge collections</td>
              </tr>
              <tr>
                <td>
                  <a href={REPOS.embed} target="_blank" rel="noopener noreferrer">
                    layer-gateway-embed-v1
                  </a>
                </td>
                <td>Embedding gateway for query and document vectors</td>
              </tr>
              <tr>
                <td>
                  <a href={REPOS.reranker} target="_blank" rel="noopener noreferrer">
                    layer-gateway-reranker-v1
                  </a>
                </td>
                <td>Cross-encoder reranking of retrieved chunks</td>
              </tr>
              <tr>
                <td>
                  <a href={REPOS.inference} target="_blank" rel="noopener noreferrer">
                    layer-gateway-inference-v1
                  </a>
                </td>
                <td>Chat completions gateway fronting vLLM (Qwen2.5-7B-Instruct + LoRA routers)</td>
              </tr>
              <tr>
                <td>
                  <a href={REPOS.mcpGithub} target="_blank" rel="noopener noreferrer">
                    layer-mcp-github-v1
                  </a>
                </td>
                <td>GitHub repo search and README retrieval via MCP</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Each service exposes <code>/health</code> and <code>/ready</code>. The orchestrator returns{" "}
          <code>503</code> when upstream inference or RAG is unavailable, so bad traffic never reaches
          a half-dead dependency chain.
        </p>
      </section>

      <section>
        <h2>End-to-end request trace</h2>
        <p>
          Observability is where this architecture diverges from tutorial RAG demos. Every HuntAI
          request carries correlation IDs from the browser through every hop:
        </p>
        <BlogPre title="Correlation IDs (HTTP headers + first SSE frame)">
          {`
X-Request-Id:  req_a1b2c3...
X-Session-Id:  ses_f4e5d6...
X-Trace-Id:    tr_789abc...
conversation_id: conv_012def...   (JSON body)
`.trim()}
        </BlogPre>
        <BlogPre title="Trace propagation">
          {`
request_id
   │
trace_id ──────► LangSmith (optional feedback + run search)
   │
   ├─► layer-gateway-api-v1
   │
   ├─► layer-orchestrator-v1
   │      ├── rewrite
   │      ├── route
   │      └── tool phase (RAG / GitHub MCP / web)
   │
   ├─► layer-rag-query-v1
   │      ├── embed (layer-gateway-embed-v1)
   │      └── rerank (layer-gateway-reranker-v1)
   │
   └─► layer-gateway-inference-v1 ──► vLLM
`.trim()}
        </BlogPre>
        <p>
          The web UI debug panel surfaces route, latency timeline, trace links (LangSmith, Grafana
          Loki), and per-step timings—so a slow answer is diagnosable without reading server logs
          first.
        </p>
      </section>

      <section>
        <h2>Why we did not start with agents</h2>
        <p>
          Many AI products begin with agent frameworks that loop until the model decides it is done.
          HuntAI deliberately chose deterministic orchestration first.
        </p>
        <ul className="blog-list-check">
          <li>Easier debugging — one route, one tool call, one answer path per request</li>
          <li>Lower latency — no multi-turn planner loop on the hot path</li>
          <li>Predictable routing — structured JSON from a fine-tuned router, not free-form tool choice</li>
          <li>Better evaluation — golden datasets with pass/fail per question</li>
        </ul>
        <p>
          The pipeline is fixed: rewrite → route → execute → stream → trace. Agent loops can be added
          later when a business case requires multi-step reasoning—but most enterprise questions do
          not need that complexity on day one.
        </p>
      </section>

      <section>
        <h2>Request pipeline: rewrite, route, execute</h2>
        <p>
          <strong>Example question:</strong> What are the renewal requirements for H4 EAD?
        </p>

        <h3>1. Rewrite</h3>
        <p>
          The router model normalizes the question for retrieval and classification. Multi-turn context
          is folded in when <code>history</code> is present.
        </p>

        <h3>2. Route</h3>
        <p>
          A lightweight Qwen2.5-7B router—fine-tuned with SFT then DPO—returns structured JSON. This
          is the actual router output shape, not a simplified sketch:
        </p>
        <BlogPre title="Router decision (layer-orchestrator-v1)">
          {`
{
  "rewritten_question": "What are the renewal requirements for H4 EAD?",
  "route": "rag_private_kb",
  "confidence": 0.97,
  "static_answer": null,
  "reason": "Private knowledge base retrieval required"
}
`.trim()}
        </BlogPre>
        <p>Supported routes include tool paths and internal intents:</p>
        <BlogPre>{`
rag_private_kb | github_repo_search | web_search
greeting | identity | help | capabilities | clarify | reject
`.trim()}</BlogPre>

        <h3>3. Execute</h3>
        <p>
          For <code>rag_private_kb</code>, the orchestrator calls{" "}
          <code>layer-rag-query-v1</code>, which embeds the query, retrieves candidates, reranks, and
          returns context. Generation runs through <code>layer-gateway-inference-v1</code> with citations
          attached on the final <code>done</code> event.
        </p>
      </section>

      <section>
        <h2>Real SSE stream</h2>
        <p>
          HuntAI streams over Server-Sent Events. The web BFF forwards frames from the gateway; the
          orchestrator emits typed JSON on each event. A production RAG answer looks like this on the
          wire:
        </p>
        <BlogPre title="SSE wire format (abbreviated)">
          {`
event: correlation
data: {"type":"correlation","request_id":"req_...","trace_id":"tr_...",
       "session_id":"ses_...","conversation_id":"conv_...","is_new_conversation":false}

event: rewrite
data: {"type":"rewrite","text":"What are the renewal requirements for H4 EAD?"}

event: route
data: {"type":"route","route":"rag_private_kb","route_detail":{"type":"tool",
       "name":"rag_private_kb","confidence":0.97},"route_source":"router_model"}

event: answer_delta
data: {"type":"answer_delta","text":"H4 EAD renewal typically requires..."}

event: answer_delta
data: {"type":"answer_delta","text":" ... filing Form I-765 before expiry."}

event: done
data: {"type":"done","latency_ms":{"total":1370,"intent_router":{"total":142},
       "rag":{"retrieve_rerank":550,"chat":620}},"usage":{"total":{"prompt_tokens":840,
       "completion_tokens":156,"total_tokens":996}},"answer":{"citations":[...]}}
`.trim()}
        </BlogPre>
        <p>
          Clients can render tokens as they arrive (<code>answer_delta</code>) while still receiving
          the full envelope—citations, follow-ups, latency, token usage—on <code>done</code>.
        </p>
      </section>

      <section>
        <h2>Evaluating the router</h2>
        <p>
          Routing quality is measured against golden datasets, not vibes. HuntAI ships a batch eval
          harness that calls <code>POST /v1/orchestrator/eval/router</code> for every row in CSV
          suites under <code>router-eval/golden-test/data/</code>.
        </p>
        <BlogPre title="Golden test example">
          {`
Question:         What are the renewal requirements for H4 EAD?
Expected route:   rag_private_kb
Predicted route:  rag_private_kb
Result:           PASS (route_match: true)
`.trim()}
        </BlogPre>
        <p>Two router LoRA adapters are scored independently:</p>
        <BlogPre>{`
Qwen2.5-7B-Instruct
├── router-qwen2.5-7b-sft-v1.00   (supervised fine-tune)
└── router-qwen2.5-7b-dpo-v1.00   (direct preference optimization)
`.trim()}</BlogPre>
        <p>
          The runner produces per-suite CSVs and a Markdown report with match rates and bad items.
          Prompt versions (<code>router-v2.00</code>, etc.) are pinned in deployment manifests so
          regressions are caught before rollout. See the{" "}
          <a href={REPOS.routerEval} target="_blank" rel="noopener noreferrer">
            golden test harness
          </a>{" "}
          for the full workflow.
        </p>
      </section>

      <section>
        <h2>Performance: where latency goes</h2>
        <p>
          A common question from platform engineers: how much overhead does orchestration add? In
          practice, router inference is small compared to retrieval and generation. HuntAI reports
          nested <code>latency_ms</code> on every response so you can answer that from production data,
          not guesses.
        </p>
        <BlogLatencyChart />
        <p>
          On a typical RAG path, rewrite and route together are often under 300 ms. Retrieval plus
          rerank dominates until context is large; generation scales with output length. GitHub MCP
          and web-search routes add their own nested timings under <code>latency_ms.github</code> or
          tool-specific keys.
        </p>
      </section>

      <section>
        <h2>Deployment architecture</h2>
        <p>
          HuntAI runs on a home-lab k3s cluster with GitOps delivery—not a managed PaaS abstraction.
          That choice keeps the same service boundaries in dev and prod.
        </p>
        <BlogPre title="GitOps delivery">
          {`
GitHub push (layer-orchestrator-v1 main)
   │
   ▼
CI ──► pin image SHA in huntai-k3s manifests
   │
   ▼
Argo CD (orchestrator-dev, gateway-dev, …)
   │
   ▼
k3s cluster (namespace: ai-dev)
   │
   ├── layer-gateway-api-v1
   ├── layer-orchestrator-v1
   ├── layer-rag-query-v1
   ├── layer-gateway-reranker-v1
   ├── layer-gateway-embed-v1
   ├── layer-gateway-inference-v1 ──► vLLM (Qwen2.5-7B + LoRA)
   ├── layer-mcp-github-v1
   └── layer-web-v1
        │
        ▼
Cloudflare Tunnel (dev ingress → taixingai.com)
`.trim()}
        </BlogPre>
        <p>
          Inference runs on GPU nodes via vLLM with LoRA adapters loaded for router models. Prometheus
          and Grafana Cloud collect HTTP and pipeline metrics; Loki indexes logs by{" "}
          <code>trace_id</code>. Manifests and deploy runbooks live in{" "}
          <a href={REPOS.k3s} target="_blank" rel="noopener noreferrer">
            huntai-k3s
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Production hardening</h2>
        <ul className="blog-list-check">
          <li>
            <strong>Readiness gates</strong> — orchestrator <code>/ready</code> checks inference and
            RAG HTTP before accepting traffic
          </li>
          <li>
            <strong>Structured logging</strong> — every request logs <code>request_id</code>,{" "}
            <code>trace_id</code>, <code>route</code>, and <code>latency_ms</code>
          </li>
          <li>
            <strong>Access control forwarding</strong> — user roles and groups propagate to RAG for
            collection-scoped retrieval
          </li>
          <li>
            <strong>Deterministic short-circuits</strong> — known patterns (e.g. HuntAI repo questions)
            can bypass the router LLM via rules when confidence is already effectively 1.0
          </li>
        </ul>
      </section>

      <section>
        <h2>Repository map</h2>
        <ul className="blog-link-list">
          <li>
            <a href={REPOS.orchestrator} target="_blank" rel="noopener noreferrer">
              layer-orchestrator-v1
            </a>
            {" — pipeline, router, SSE, eval endpoint"}
          </li>
          <li>
            <a href={REPOS.gateway} target="_blank" rel="noopener noreferrer">
              layer-gateway-api-v1
            </a>
            {" — auth, sessions, upstream proxy"}
          </li>
          <li>
            <a href={REPOS.k3s} target="_blank" rel="noopener noreferrer">
              huntai-k3s
            </a>
            {" — Argo CD apps, manifests, deploy docs"}
          </li>
        </ul>
        <p>
          Want to see routing in action?{" "}
          <Link href="/signup" className="blog-inline-link">
            Sign up for HuntAI
          </Link>{" "}
          and inspect the Details panel on any answer—route, latency timeline, and trace links included.
        </p>
      </section>

      <section>
        <h2>Closing</h2>
        <p>
          The orchestrator is the operating system of HuntAI: it connects models, retrieval, tools, and
          observability into one coherent user experience. The interesting engineering is not picking a
          framework—it is making routing testable, latency visible, and deployment repeatable.
        </p>
        <p className="blog-closing">Build smart. Route deterministically. Measure everything.</p>
      </section>
    </article>
  );
}
