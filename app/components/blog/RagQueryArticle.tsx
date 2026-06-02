/**
 * Article body: layer-rag-query-v1 production RAG design deep-dive.
 */

import Link from "next/link";

import { BlogPre } from "@/components/blog/BlogPre";
import { blogPostPath } from "@/lib/blog-posts";

const REPOS = {
  rag: "https://github.com/taixingbi/layer-rag-query-v1",
  embed: "https://github.com/taixingbi/layer-gateway-embed-v1",
  reranker: "https://github.com/taixingbi/layer-gateway-reranker-v1",
  inference: "https://github.com/taixingbi/layer-gateway-inference-v1",
  orchestrator: "https://github.com/taixingbi/layer-orchestrator-v1",
  ingest: "https://github.com/taixingbi/layer-rag-ingest-v1",
  k3s: "https://github.com/taixingbi/huntai-k3s",
  deploy: "https://github.com/taixingbi/huntai-k3s/blob/main/docs/deploy-rag-query.md",
  schema: "https://github.com/taixingbi/layer-rag-query-v1/blob/main/docs/schema.md",
  streaming: "https://github.com/taixingbi/layer-rag-query-v1/blob/main/docs/streaming.md",
  accessControl:
    "https://github.com/taixingbi/layer-rag-query-v1/blob/main/docs/access-control.md",
} as const;

export function RagQueryArticle() {
  return (
    <article className="blog-article">
      <header className="blog-article-header">
        <p className="blog-eyebrow">Production engineering · HuntAI platform</p>
        <h1>Hybrid RAG in Production: Inside layer-rag-query-v1</h1>
        <p className="blog-lede">
          When HuntAI routes a question to private knowledge, it does not call a vector database from
          the orchestrator directly. Retrieval, reranking, citation extraction, and answer generation
          run in <code>layer-rag-query-v1</code>—with hybrid search, access-controlled Qdrant filters,
          and SSE streaming tuned for real chat UIs.
        </p>
      </header>

      <section>
        <h2>The system at a glance</h2>
        <BlogPre title="RAG path in HuntAI">
          {`
layer-orchestrator-v1
        │  route: rag_private_kb
        ▼
layer-rag-query-v1  (POST /v1/rag/query)
        │
        ├── layer-gateway-embed-v1   → query vector
        ├── Qdrant                   → hybrid retrieve (dense + BM25 + RRF)
        ├── layer-gateway-reranker-v1 → cross-encoder rerank
        └── layer-gateway-inference-v1 → grounded answer + follow-ups
        │
        ▼
answer, citations, follow_up_questions, latency_ms, usage
`.trim()}
        </BlogPre>
        <p>
          Documents are ingested separately (e.g.{" "}
          <a href={REPOS.ingest} target="_blank" rel="noopener noreferrer">
            layer-rag-ingest-v1
          </a>
          ) into Qdrant collections such as <code>taixing_knowledge_dev</code>. The query service only
          reads—keeping ingest and query deploy cycles independent.
        </p>
      </section>

      <section>
        <h2>The RAG service stack</h2>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Role in RAG</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <a href={REPOS.rag} target="_blank" rel="noopener noreferrer">
                    layer-rag-query-v1
                  </a>
                </td>
                <td>
                  <code>POST /v1/rag/query</code> — retrieve, rerank, prompt, generate, cite
                </td>
              </tr>
              <tr>
                <td>
                  <a href={REPOS.embed} target="_blank" rel="noopener noreferrer">
                    layer-gateway-embed-v1
                  </a>
                </td>
                <td>Embeds the user question (<code>/v1/embeddings</code>)</td>
              </tr>
              <tr>
                <td>Qdrant</td>
                <td>Vector store + sparse BM25; collection per ENV suffix</td>
              </tr>
              <tr>
                <td>
                  <a href={REPOS.reranker} target="_blank" rel="noopener noreferrer">
                    layer-gateway-reranker-v1
                  </a>
                </td>
                <td>Reranks retrieved passages (<code>/v1/rerank</code>)</td>
              </tr>
              <tr>
                <td>
                  <a href={REPOS.inference} target="_blank" rel="noopener noreferrer">
                    layer-gateway-inference-v1
                  </a>
                </td>
                <td>Chat completion for answer and follow-up questions</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Hybrid retrieval (not vector-only)</h2>
        <p>
          HuntAI uses <strong>dense + BM25 + reciprocal rank fusion (RRF)</strong> before any reranker
          or LLM call. Dense recall pulls semantically similar chunks; BM25 catches lexical matches
          (names, visa codes, exact phrases); RRF merges ranked lists without calibrating scores
          across modalities.
        </p>
        <BlogPre title="Retrieval phases">
          {`
question
   │
   ▼
embed (layer-gateway-embed-v1)
   │
   ▼
Qdrant hybrid search
   ├── dense top-K (TOP_K_DENSE)
   └── BM25 sparse
   │
   ▼
RRF fusion (RRF_K constant)
   │
   ▼
optional rerank pool → final_context_top_k chunks
`.trim()}
        </BlogPre>
        <p>
          Collection names are logical bases plus environment: <code>collection_base</code>{" "}
          <code>taixing_knowledge</code> with <code>ENV=dev</code> resolves to{" "}
          <code>taixing_knowledge_dev</code> in Qdrant.
        </p>
      </section>

      <section>
        <h2>Access-controlled retrieval</h2>
        <p>
          Enterprise RAG must not return HR-only chunks to every user. HuntAI applies Qdrant filters
          from headers forwarded by the orchestrator (
          <a href={REPOS.accessControl} target="_blank" rel="noopener noreferrer">
            access-control.md
          </a>
          ):
        </p>
        <BlogPre>{`
X-User-Id: taixing
X-User-Roles: hr, anyuser
X-User-Groups: engineering
X-User-Teams: rag-platform
`.trim()}
        </BlogPre>
        <ul className="blog-list-check">
          <li>Match rule: ANY-OVERLAP across roles, groups, and teams</li>
          <li>
            <code>admin</code> role bypasses payload filters
          </li>
          <li>Chunks without <code>payload.access</code> are deny-by-default for non-admins</li>
          <li>
            Correlation and ACL fields are <strong>header-only</strong>—putting them in the JSON body
            returns <code>400</code>
          </li>
        </ul>
      </section>

      <section>
        <h2>Generation, citations, and follow-ups</h2>
        <p>
          After context is assembled, the service calls inference with grounded passages, extracts
          inline <code>[n]</code> citations, and optionally runs a second chat pass for follow-up
          questions (reranked down to a small set for the UI).
        </p>
        <BlogPre title="JSON response shape (stream: false, abbreviated)">
          {`
{
  "answer": "Taixing's visa status is H1-B EAD [1]...",
  "citations": [
    {"cite_id": 1, "chunk_id": "...", "source": "profile.md", "text": "..."}
  ],
  "follow_up_questions": [
    "What documents are required for H4 EAD renewal?"
  ],
  "latency_ms": {
    "embed": 120,
    "retrieve_rerank": 340,
    "chat": 2100,
    "follow_up_chat": 480,
    "total": 3040
  },
  "usage": { "chat": {...}, "follow_up_chat": {...}, "total": {...} },
  "request_id": "req_...",
  "session_id": "ses_...",
  "conversation_id": "conv_..."
}
`.trim()}
        </BlogPre>
        <p>
          If the model returns empty or exact <code>NOT_FOUND</code>,{" "}
          <code>expand_on_not_found</code> widens the context slice and retries—without streaming
          intermediate failure text to the user.
        </p>
      </section>

      <section>
        <h2>SSE streaming for chat UIs</h2>
        <p>
          Streaming is the default (<code>stream: true</code>). The wire format matches production
          chat clients (
          <a href={REPOS.streaming} target="_blank" rel="noopener noreferrer">
            streaming.md
          </a>
          ):
        </p>
        <BlogPre title="Happy-path SSE order">
          {`
event: meta
event: latency   (phase=embed)
event: latency   (phase=retrieve_rerank)
event: answer_start
event: answer_delta × N
event: answer_end
event: latency   (phase=chat)
event: citations
event: follow_up_questions
event: latency   (phase=follow_up_chat)
event: usage
event: latency   (phase=total)
event: done
`.trim()}
        </BlogPre>
        <p>
          Response headers include <code>Cache-Control: no-cache</code> and{" "}
          <code>X-Accel-Buffering: no</code> so nginx ingress on k3s does not buffer SSE. UI
          &ldquo;Stop&rdquo; aborts the fetch; the server cancels upstream generation and frees the GPU
          slot.
        </p>
      </section>

      <section>
        <h2>Observability trace</h2>
        <BlogPre title="Correlation across RAG dependencies">
          {`
X-Request-Id / X-Session-Id / X-Trace-Id  (headers only)
   │
   ├─► layer-rag-query-v1 logs (JSON stderr → Loki)
   ├─► layer-gateway-embed-v1
   ├─► layer-gateway-reranker-v1
   └─► layer-gateway-inference-v1

Same request_id stitches embed → retrieve → chat in Grafana
`.trim()}
        </BlogPre>
        <p>
          <code>GET /metrics</code> exposes <code>rag_query_*</code> histograms; debug mode can return{" "}
          <code>retrieval_hits</code> with per-stage ranks for eval without leaking full passage text
          in logs. HuntAI ships these series to Grafana Cloud with{" "}
          <code>workload=rag-query</code>—see{" "}
          <Link href={blogPostPath("grafana-observability")} className="blog-inline-link">
            Observability with Grafana Cloud
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>Orchestrator integration</h2>
        <p>
          The orchestrator calls RAG over HTTP when the router selects{" "}
          <code>rag_private_kb</code>. It forwards user ACL headers and aggregates{" "}
          <code>latency_ms.rag</code> into the client SSE <code>done</code> envelope—so the web UI
          timeline shows retrieve, rerank, and generate as nested phases under RAG.
        </p>
        <BlogPre>{`
Orchestrator env (dev):
  RAG_HTTP_BASE_URL=http://layer-rag-query:8000
  RAG_COLLECTION_BASE=taixing_knowledge
  RAG_K=5  RAG_K_MAX=40
`.trim()}
        </BlogPre>
      </section>

      <section>
        <h2>Deployment on k3s</h2>
        <BlogPre title="GitOps (dev)">
          {`
Argo CD app: rag-query-dev
   │
   ▼
layer-rag-query (namespace ai-dev)
   ├── NodePort 30183  (LAN smoke tests)
   ├── ENV=dev → taixing_knowledge_dev
   ├── EMBEDDING_URL → gateway-embedding :30181
   ├── RERANK_URL    → gateway-reranker :30182
   └── INFERENCE_URL → gateway-inference :30180

GET /ready → 503 if Qdrant unreachable
`.trim()}
        </BlogPre>
        <p>
          Deploy runbook:{" "}
          <a href={REPOS.deploy} target="_blank" rel="noopener noreferrer">
            huntai-k3s deploy-rag-query.md
          </a>
          . Full request/response contract:{" "}
          <a href={REPOS.schema} target="_blank" rel="noopener noreferrer">
            layer-rag-query-v1 docs/schema.md
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Evaluation</h2>
        <p>
          The repo ships gold datasets under <code>eva/</code> for offline answer quality metrics—
          separate from router golden tests, but the same engineering mindset: measure before changing
          retrieval defaults in production.
        </p>
        <BlogPre>{`
python eva/test.py -i eva/dataset/dataset-gold-test-1.0.0.json -o eva/result/...
python eva/metric.py -i eva/result/... -o eva/result/...-eva-...
`.trim()}
        </BlogPre>
      </section>

      <section>
        <h2>Related reading</h2>
        <ul className="blog-link-list">
          <li>
            <Link href={blogPostPath("building-an-ai-orchestrator")} className="blog-inline-link">
              From Prompt to Response: Inside HuntAI&apos;s Orchestrator
            </Link>
            {" — routes to RAG and streams the merged answer"}
          </li>
          <li>
            <Link href={blogPostPath("layer-gateway-inference-design")} className="blog-inline-link">
              GPU-Aware Inference Routing
            </Link>
            {" — generation gateway behind RAG chat calls"}
          </li>
          <li>
            <Link href={blogPostPath("router-sft-dpo-training")} className="blog-inline-link">
              Training the HuntAI Router
            </Link>
            {" — when questions reach this service"}
          </li>
        </ul>
      </section>

      <section>
        <h2>Repository</h2>
        <ul className="blog-link-list">
          <li>
            <a href={REPOS.rag} target="_blank" rel="noopener noreferrer">
              layer-rag-query-v1
            </a>
            {" — hybrid retrieval, HTTP API, MCP, metrics"}
          </li>
          <li>
            <a href={REPOS.k3s} target="_blank" rel="noopener noreferrer">
              huntai-k3s
            </a>
            {" — manifests and smoke curls"}
          </li>
        </ul>
      </section>

      <section>
        <h2>Closing</h2>
        <p>
          Production RAG is more than embedding search—it is hybrid recall, ACL-aware filtering,
          reranking, grounded generation, and streaming ergonomics in one service.{" "}
          <code>layer-rag-query-v1</code> is where HuntAI turns private documents into cited, measurable
          answers.
        </p>
        <p className="blog-closing">Retrieve with fusion. Rerank with purpose. Generate with citations.</p>
      </section>
    </article>
  );
}
