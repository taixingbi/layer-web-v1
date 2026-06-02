/**
 * Article body: auth → gateway → orchestrator → RAG ACL (production RBAC).
 */

import Link from "next/link";

import { BlogPre } from "@/components/blog/BlogPre";
import { blogPostPath } from "@/lib/blog-posts";

const REPOS = {
  webAuth: "https://github.com/taixingbi/layer-web-v1/blob/main/docs/auth-design.md",
  gateway: "https://github.com/taixingbi/layer-gateway-api-v1",
  gatewaySchema: "https://github.com/taixingbi/layer-gateway-api-v1/blob/main/docs/schema.md",
  orchestrator: "https://github.com/taixingbi/layer-orchestrator-v1",
  orchestratorDesign: "https://github.com/taixingbi/layer-orchestrator-v1/blob/main/docs/design.md",
  rag: "https://github.com/taixingbi/layer-rag-query-v1",
  ragAcl: "https://github.com/taixingbi/layer-rag-query-v1/blob/main/docs/access-control.md",
  ingestAcl: "https://github.com/taixingbi/layer-rag-ingest-v1/blob/main/docs/access_control.md",
} as const;

export function RbacAccessArticle() {
  return (
    <article className="blog-article">
      <header className="blog-article-header">
        <p className="blog-eyebrow">Security · HuntAI platform</p>
        <h1>From Login to Retrieval: Role-Based Access in HuntAI</h1>
        <p className="blog-lede">
          HuntAI does not let the browser talk to Qdrant or pass roles in a chat JSON body. Identity
          is established at the gateway, forwarded as trusted headers through the orchestrator, and
          enforced as a Qdrant payload filter at retrieval time—so private knowledge stays scoped to
          the signed-in user.
        </p>
      </header>

      <section>
        <h2>Design principle: authenticate once, enforce at retrieval</h2>
        <p>
          Role-based access control (RBAC) in HuntAI spans three layers with one rule:{" "}
          <strong>only the gateway may interpret credentials</strong>. Downstream services trust
          normalized identity headers they receive from an in-cluster caller, not fields in the
          request body.
        </p>
        <ul className="blog-list-check">
          <li>
            <strong>Authentication</strong> — Supabase session or JWKS-validated JWT at{" "}
            <code>layer-gateway-api-v1</code>
          </li>
          <li>
            <strong>Authorization context</strong> — roles, group, and team mapped to{" "}
            <code>X-User-*</code> headers for the orchestrator
          </li>
          <li>
            <strong>Data-plane enforcement</strong> — Qdrant <code>payload.access</code> filters in{" "}
            <code>layer-rag-query-v1</code> on the dense retrieval leg
          </li>
        </ul>
      </section>

      <section>
        <h2>End-to-end flow</h2>
        <BlogPre title="Browser → vectors (happy path)">
          {`
Browser (layer-web-v1)
   │  POST /api/v1/chat  +  Cookie: layer_access_token
   ▼
Next.js BFF
   │  Authorization: Bearer <access_token>
   ▼
layer-gateway-api-v1
   │  Supabase get_user(token) → profiles row
   │  auth_context: user_id, roles[], groups[], teams[]
   │  ORCHESTRATOR_CONTRACT=flat_headers
   ▼
layer-orchestrator-v1
   │  route: rag_private_kb
   │  POST /v1/rag/query  +  X-User-* headers
   ▼
layer-rag-query-v1
   │  RagUser.from_headers()
   │  build_qdrant_access_filter() → query_points(...)
   ▼
Qdrant  (only chunks matching ACL)
`.trim()}
        </BlogPre>
        <p>
          Correlation IDs (<code>X-Request-Id</code>, <code>X-Session-Id</code>,{" "}
          <code>X-Trace-Id</code>) travel on the same header plane; they are not a substitute for
          identity and must not be confused with ACL fields.
        </p>
      </section>

      <section>
        <h2>Step 1 — Sign-in and session (web + gateway)</h2>
        <p>
          Production HuntAI uses per-user Supabase sessions. The user signs in at{" "}
          <code>/login</code>; the Next.js BFF proxies to gateway{" "}
          <code>POST /v1/auth/login</code> and stores <code>layer_access_token</code> in an httpOnly
          cookie. Chat and feedback routes resolve the bearer via{" "}
          <a href={REPOS.webAuth} target="_blank" rel="noopener noreferrer">
            auth-design.md
          </a>{" "}
          before any upstream call.
        </p>
        <BlogPre title="BFF bearer resolution (order)">
          {`
1. Inbound Authorization: Bearer (if present)
2. Else httpOnly layer_access_token cookie
3. Else 401 — no shared server token fallback
`.trim()}
        </BlogPre>
        <p>
          The gateway <code>AuthMiddleware</code> rejects missing or invalid tokens on all business
          routes. Probes (<code>/health</code>, <code>/ready</code>, <code>/metrics</code>,{" "}
          <code>/version</code>) and public auth endpoints stay unauthenticated so k3s and monitors
          do not need user cookies.
        </p>
      </section>

      <section>
        <h2>Step 2 — Profile claims → auth_context</h2>
        <p>
          After token verification, the gateway loads the user&apos;s Supabase{" "}
          <code>profiles</code> row and builds a compact <code>auth_context</code> attached to{" "}
          <code>request.state</code> for the lifetime of the request:
        </p>
        <BlogPre title="auth_context (conceptual)">
          {`
{
  "user_id": "<uuid>",
  "tenant_id": "<optional>",
  "roles": ["hr", "engineer"],
  "groups": ["engineering"],
  "teams": ["rag-platform"]
}
`.trim()}
        </BlogPre>
        <p>
          Roles come from the profile as a normalized list. Group and team are single profile fields
          expanded to one-element lists for the orchestrator contract—so a user in group{" "}
          <code>engineering</code> on team <code>rag-platform</code> becomes comma-separated values
          on <code>X-User-Groups</code> and <code>X-User-Teams</code> when the gateway calls the
          orchestrator.
        </p>
        <p>
          Alternative deployments can use JWKS validation instead of Supabase; the same{" "}
          <code>claims_to_auth_context</code> mapping applies once the token is trusted.
        </p>
      </section>

      <section>
        <h2>Step 3 — Gateway → orchestrator (flat_headers)</h2>
        <p>
          HuntAI dev uses <code>ORCHESTRATOR_CONTRACT=flat_headers</code>. The gateway does not embed
          roles inside a nested JSON auth object for chat; it sends identity on HTTP headers the
          orchestrator already understands (
          <a href={REPOS.gatewaySchema} target="_blank" rel="noopener noreferrer">
            gateway schema
          </a>
          ):
        </p>
        <BlogPre>{`
X-User-Id:       <user_id>
X-User-Roles:    hr,engineer
X-User-Groups:   engineering
X-User-Teams:    rag-platform
X-Conversation-Id: <optional>
`.trim()}
        </BlogPre>
        <p>
          The orchestrator rejects <code>X-User-*</code> (and other correlation fields) if they
          appear in the JSON body—clients cannot spoof ACL by adding fields next to{" "}
          <code>question</code>. Only headers and the allowed body fields (such as{" "}
          <code>conversation_id</code>) are accepted (
          <a href={REPOS.orchestratorDesign} target="_blank" rel="noopener noreferrer">
            orchestrator design
          </a>
          ).
        </p>
      </section>

      <section>
        <h2>Step 4 — Orchestrator → RAG query</h2>
        <p>
          When the intent router selects <code>rag_private_kb</code>, the orchestrator calls{" "}
          <code>POST /v1/rag/query</code> on <code>layer-rag-query-v1</code> and relays the same{" "}
          <code>X-User-*</code> headers. MCP tools (e.g. GitHub search) receive the same identity
          plane for consistency. The RAG service does not re-verify the JWT—it assumes the caller
          is the gateway path inside the cluster.
        </p>
        <p>
          That trust boundary is intentional: keep crypto and session state at the edge; keep
          retrieval fast and deterministic in the data plane. Do not expose{" "}
          <code>layer-rag-query-v1</code> NodePort to untrusted networks without an authenticating
          front door.
        </p>
      </section>

      <section>
        <h2>Step 5 — Ingest-time labels (where ACL tags come from)</h2>
        <p>
          Access control is applied when vectors are written, not guessed at query time. During
          ingest, <code>layer-rag-ingest-v1</code> attaches an optional{" "}
          <code>payload.access</code> block per chunk from per-environment{" "}
          <code>access_control.json</code> (
          <a href={REPOS.ingestAcl} target="_blank" rel="noopener noreferrer">
            ingest access_control.md
          </a>
          ):
        </p>
        <BlogPre title="Chunk payload (excerpt)">
          {`
{
  "text": "...",
  "source": "personal_profile",
  "access": {
    "roles": ["admin", "hr", "recruiter", "engineer", "public"],
    "groups": ["engineering"],
    "teams": ["rag-platform"]
  }
}
`.trim()}
        </BlogPre>
        <p>
          Lookup keys resolve in order: <code>source:document_id</code>, then <code>source</code>,
          then <code>document_id</code>. Chunks with no matching policy get no{" "}
          <code>access</code> field—they are visible only to admins at query time.
        </p>
      </section>

      <section>
        <h2>Step 6 — Qdrant filter at retrieval</h2>
        <p>
          <code>layer-rag-query-v1</code> builds a <code>RagUser</code> from headers and applies a
          filter on the dense leg (BM25 reranks the already-filtered pool). Full semantics are in{" "}
          <a href={REPOS.ragAcl} target="_blank" rel="noopener noreferrer">
            access-control.md
          </a>
          ; the operational summary:
        </p>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>Caller identity</th>
                <th>Filter</th>
                <th>Sees public chunks (roles contain anyuser)</th>
                <th>Sees untagged chunks</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>admin</code> role (any case)
                </td>
                <td>none (bypass)</td>
                <td>yes</td>
                <td>yes</td>
              </tr>
              <tr>
                <td>Signed-in user with roles/groups/teams</td>
                <td>ANY-OVERLAP on access.roles OR access.groups OR access.teams</td>
                <td>if tagged</td>
                <td>no</td>
              </tr>
              <tr>
                <td>Anonymous (no X-User-Roles)</td>
                <td>defaults to roles=[anyuser]</td>
                <td>yes</td>
                <td>no</td>
              </tr>
            </tbody>
          </table>
        </div>
        <BlogPre title="Qdrant filter shape (non-admin)">
          {`
Filter(should=[
  FieldCondition(key="access.roles",  match=MatchAny(any=[...user roles...])),
  FieldCondition(key="access.groups", match=MatchAny(any=[...user groups...])),
  FieldCondition(key="access.teams",  match=MatchAny(any=[...user teams...])),
])
`.trim()}
        </BlogPre>
        <p>
          Empty user dimensions contribute no <code>should</code> clause—they do not widen access.
          Missing <code>X-User-Roles</code> does not mean &ldquo;see everything&rdquo;; it means
          &ldquo;see only chunks explicitly tagged for anonymous/public readers.&rdquo;
        </p>
      </section>

      <section>
        <h2>Header contract (RAG service)</h2>
        <BlogPre title="X-User-* headers (header-only)">
          {`
Header              Default if missing
──────────────────  ─────────────────────────────
X-User-Id           "-"
X-User-Roles        ["anyuser"]
X-User-Groups       []
X-User-Teams        []
`.trim()}
        </BlogPre>
        <p>
          Putting <code>user_id</code>, <code>user_roles</code>, <code>user_groups</code>, or{" "}
          <code>user_teams</code> in the JSON body returns <code>400</code>, same as putting{" "}
          <code>request_id</code> in the body. Smoke tests and gateways should set headers only.
        </p>
      </section>

      <section>
        <h2>What this does not do (yet)</h2>
        <ul className="blog-list-check">
          <li>
            Row-level security on Supabase chat history is separate from RAG chunk ACL (see gateway
            SQL RLS for conversations)
          </li>
          <li>
            GitHub MCP visibility is tool-scoped, not Qdrant <code>payload.access</code>
          </li>
          <li>
            Router model choice is not RBAC—wrong routing can still send a user to a tool that does
            not need private KB
          </li>
        </ul>
        <p>
          Operational hygiene: rotate ingest <code>access_control.json</code> per environment,
          re-prepare payloads, and use distinct Qdrant collection suffixes (
          <code>taixing_knowledge_dev</code> vs prod) so policy experiments never overwrite
          production vectors.
        </p>
      </section>

      <section>
        <h2>Debugging ACL in production</h2>
        <BlogPre title="Checklist">
          {`
1. Gateway logs: auth_context roles/groups/teams on chat ingress
2. Orchestrator: route == rag_private_kb and outbound RAG headers
3. RAG logs: RagUser + filter applied (admin bypass vs should-clauses)
4. Qdrant: chunk has payload.access? roles include anyuser for public docs?
5. Grafana: same trace_id across gateway → orchestrator → rag-query
`.trim()}
        </BlogPre>
        <p>
          If HR users see empty answers but admins do not, the usual causes are missing{" "}
          <code>payload.access</code> on chunks, role names that do not overlap ingest policy, or
          a caller that bypasses the gateway and omits <code>X-User-Roles</code>.
        </p>
      </section>

      <section>
        <h2>Related reading</h2>
        <ul className="blog-link-list">
          <li>
            <Link href={blogPostPath("layer-rag-query-design")} className="blog-inline-link">
              Hybrid RAG in Production
            </Link>
            {" — retrieval, rerank, and citations (ACL section)"}
          </li>
          <li>
            <Link href={blogPostPath("building-an-ai-orchestrator")} className="blog-inline-link">
              Inside HuntAI&apos;s Orchestrator
            </Link>
            {" — routing to rag_private_kb and SSE envelopes"}
          </li>
          <li>
            <Link href={blogPostPath("grafana-observability")} className="blog-inline-link">
              Observability with Grafana Cloud
            </Link>
            {" — trace_id across gateway and RAG"}
          </li>
        </ul>
      </section>

      <section>
        <h2>Repositories</h2>
        <ul className="blog-link-list">
          <li>
            <a href={REPOS.gateway} target="_blank" rel="noopener noreferrer">
              layer-gateway-api-v1
            </a>
            {" — AuthMiddleware, Supabase/JWKS, orchestrator client"}
          </li>
          <li>
            <a href={REPOS.orchestrator} target="_blank" rel="noopener noreferrer">
              layer-orchestrator-v1
            </a>
            {" — header relay to RAG and MCP"}
          </li>
          <li>
            <a href={REPOS.rag} target="_blank" rel="noopener noreferrer">
              layer-rag-query-v1
            </a>
            {" — RagUser, build_qdrant_access_filter, app/rag/access.py"}
          </li>
        </ul>
      </section>

      <section>
        <h2>Closing</h2>
        <p>
          HuntAI RBAC is a pipeline: prove identity at the gateway, carry it as headers through the
          orchestrator, and enforce it where data leaves Qdrant. That keeps chat UX simple, keeps
          retrieval deny-by-default, and keeps public vs HR vs admin content separable without
          teaching the LLM about permissions.
        </p>
        <p className="blog-closing">Authenticate at the edge. Tag at ingest. Filter at retrieval.</p>
      </section>
    </article>
  );
}
