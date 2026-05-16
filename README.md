# huntAI

## Design

Full technical design: **[docs/design.md](docs/design.md)**. Auth — **production JWT, per-user identity** (plus stub dev): **[docs/auth-design.md](docs/auth-design.md)**.

### Architecture

- **Next.js 15** (App Router) – chat UI + BFF API routes
- **layer-gateway-api-v1 only** – BFF calls `POST /api/chat` and `POST /api/feedback` on the gateway with `Authorization: Bearer …`, and translates gateway SSE (`meta`, `token`, `done`, `error`) into the SSE shape consumed by `app/chat/page.tsx`

```mermaid
flowchart LR
  browser[Browser]
  chatPage[ChatPage]
  nextChat[POST /api/chat]
  nextFb[POST /api/feedback]
  gateway[Gateway_API]
  orch[Orchestrator]
  browser --> chatPage
  chatPage --> nextChat
  chatPage --> nextFb
  nextChat --> gateway
  nextFb --> gateway
  gateway --> orch
```

### Components

| Component | Purpose |
|-----------|---------|
| `app/chat/page.tsx` | Chat UI; `sessionStorage` session id; `X-Request-Id` / `X-Trace-Id`; optional citations |
| `app/api/chat/route.ts` | Proxies to gateway `/api/chat`; SSE translation for the client |
| `app/api/feedback/route.ts` | Proxies to gateway `/api/feedback` (`trace_id` ← UI `run_id`) |
| `app/lib/config.ts` | `GATEWAY_BASE_URL`, `GATEWAY_BEARER_TOKEN`, `WEB_SERVICE_NAME` (server-only) |
| `app/lib/gateway-auth.ts` | Resolves bearer for upstream: **client `Authorization` first**, then `GATEWAY_BEARER_TOKEN` |
| `app/lib/server-log.ts` | Gateway-style one-line JSON logs from BFF routes (`service` defaults to `huntai-web`) |
| `app/lib/gateway-chat.ts` | Gateway SSE parsing helpers |

### Environment

See `.env` at repo root (or `.env.local` per Next.js).

| Variable | Purpose |
|----------|---------|
| `GATEWAY_BASE_URL` | Gateway origin, no trailing slash (default `http://localhost:8000`) |
| `GATEWAY_BEARER_TOKEN` | Fallback when the browser sends **no** `Authorization` header. **Local stub:** e.g. `demo-token` with gateway `AUTH_MODE=stub`. **Production (`AUTH_MODE=jwt`, per-user):** each user should send their own JWT from login/SSO; leave this unset or use only for non-interactive/service calls — if unset, the browser **must** send `Authorization: Bearer` (e.g. via `sessionStorage.layer_bearer_token`). If the browser sends `Authorization: Bearer …`, that token is forwarded **instead** of this env value. |
| `WEB_SERVICE_NAME` | Optional. JSON log field `service` for Next.js API routes (default `huntai-web`) |

### Auth: production JWT (per-user) vs stub (local)

**Production** targets gateway **`AUTH_MODE=jwt`** with a **per-user access token** on every `/api/chat` and `/api/feedback` call (after **login, signup, or SSO** you add — not in this repo). Wire the access token into the browser (today: `sessionStorage.layer_bearer_token` → `Authorization`; see [docs/auth-design.md](docs/auth-design.md)). Avoid relying on a single shared `GATEWAY_BEARER_TOKEN` for all humans unless you intentionally want one service identity.

| Gateway `AUTH_MODE` | Typical web setup | Result |
|---------------------|-------------------|--------|
| **`jwt` (production)** | User JWT on each request (e.g. after OIDC); `GATEWAY_BEARER_TOKEN` unset or non-interactive only | **Per-user** claims on the gateway/orchestrator. |
| **`jwt`** | Only `GATEWAY_BEARER_TOKEN` service JWT, no browser bearer | One shared identity for all chat (only if intentional). |
| **`jwt`** | `GATEWAY_BEARER_TOKEN=demo-token` only, no client bearer | **401** from gateway (expected). |
| `stub` (local dev) | `GATEWAY_BEARER_TOKEN=demo-token`; browser usually has no bearer | Works: any non-empty upstream bearer; identity from gateway `AUTH_STUB_*`. |
| `stub` | Browser sets `sessionStorage.layer_bearer_token` | Token forwarded; gateway still uses stub identity. |

For manual JWT testing without a login UI: `sessionStorage.setItem("layer_bearer_token", "<access_token>")` in devtools, or set `GATEWAY_BEARER_TOKEN` to a valid JWT for server-only tests.

### Gateway contract (curl)

The **example** gateway implementation is **layer-gateway-api-v1** (sibling repo / same workspace). Match its **`docs/smoke-test.md`**: paths, optional `X-Session-Id` / `X-Request-Id` / `X-Trace-Id` / `X-Conversation-Id`, JSON bodies. **`Authorization: Bearer`** is required on the gateway. **Production:** **`AUTH_MODE=jwt`** and a **valid per-user access token**. **Local stub:** **`AUTH_MODE=stub`** accepts any non-empty bearer (e.g. `demo-token`); see gateway README / `.env.example`.

## Workflow (in-app)

1. User sends a message → browser `POST /api/chat` with `{ message, conversation_id? }` and optional `X-Session-Id`, `X-Request-Id`, `X-Trace-Id`.
2. BFF → `POST {GATEWAY_BASE_URL}/api/chat` with `Accept: text/event-stream`, `stream: true`, and gateway auth.
3. When the BFF returns **SSE** (`text/event-stream`), the chat page **stream-renders**: it consumes translated events (`status`, `rewrite`, `result_chunk`, `stream_end`, `error`) and appends each `result_chunk` delta to the assistant bubble in real time. If the BFF returns **JSON** instead (non-streaming upstream path), the assistant message is shown in one shot after the body is read.
4. Feedback → `POST /api/feedback` on this app → gateway `/api/feedback` with `trace_id` / `request_id` from the chat run.

## End-to-end local run (example gateway)

This app does **not** run an orchestrator. Use **layer-gateway-api-v1** as the reference gateway: configure it with your orchestrator (see that repo’s **README** and **`.env.example`**), then point huntAI at it.

### 1) Run the example gateway (layer-gateway-api-v1)

From the gateway repo (Python **≥ 3.11**):

```bash
cd /path/to/layer-gateway-api-v1
python3.11 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env   # edit ORCHESTRATOR_* and auth as needed
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Sanity-check the gateway (stub auth; align bearer with `GATEWAY_BEARER_TOKEN` below):

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8000/health
# expect 200
```

Optional: follow **`layer-gateway-api-v1/docs/smoke-test.md`** for full `POST /api/chat` and `/api/feedback` curls against `http://localhost:8000`.

### 2) Configure this app

Default BFF target is **`http://localhost:8000`** with bearer **`demo-token`** (same as gateway stub smoke tests). To override:

```bash
cp .env.example .env.local
# set GATEWAY_BASE_URL / GATEWAY_BEARER_TOKEN if needed
```

### 3) Run Next.js

```bash
pnpm install
pnpm test
pnpm lint
pnpm dev
```

Open **http://localhost:3000/chat** — the BFF proxies to **`{GATEWAY_BASE_URL}/api/chat`** and **`{GATEWAY_BASE_URL}/api/feedback`**.

## CI

GitHub Actions runs **`pnpm install` → `pnpm lint` → `pnpm test`** on push/PR (see `.github/workflows/ci.yml`).

## Production build

```bash
pnpm build
pnpm start
```

## Docker

```bash
pnpm docker:build
pnpm docker:run
```

Or: `docker build -t huntai .` then `docker run -p 3000:3000 --env-file .env.local huntai`. App listens on port 3000.
