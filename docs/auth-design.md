# huntAI Web — Auth design

How the browser, Next.js BFF, and **layer-gateway-api-v1** agree on identity for `/api/chat` and `/api/feedback`. Gateway token verification and claim mapping live in the gateway repo; this document covers the **web + BFF** contract only.

Related: [design.md](design.md) (architecture), sibling [layer-gateway-api-v1 `docs/schema.md`](../../layer-gateway-api-v1/docs/schema.md), [`docs/smoke-test.md`](../../layer-gateway-api-v1/docs/smoke-test.md).

---

## Target production model: JWT, per-user identity

In **production**, run the gateway with **`AUTH_MODE=jwt`**. Each end user must present their own **short-lived access token** on calls to this app’s `/api/chat` and `/api/feedback` so the BFF forwards **`Authorization: Bearer <user_jwt>`** to the gateway and the orchestrator receives **claims-derived `auth` per user**.

- **Login / signup / SSO** (e.g. NextAuth, Auth.js, or corporate IdP) lives **outside this repo’s UI today**; you still need it in the product so users obtain that access token after sign-in.
- After login, the browser should attach the token on same-origin API calls (today’s hook: set `sessionStorage.layer_bearer_token` from the session access token, or replace with **httpOnly cookie + server-only** upstream if you want no JWT in JS).
- **`GATEWAY_BEARER_TOKEN`** in production is usually **empty or unused** for interactive chat so anonymous traffic cannot impersonate a user; if set, it is only used when the browser sends **no** `Authorization` header (service or break-glass paths). Prefer **requiring** a client bearer for human traffic.

**Local development** often uses gateway **`AUTH_MODE=stub`** and `GATEWAY_BEARER_TOKEN=demo-token` with no browser bearer (see matrix below).

---

## Goals

1. **Production: per-user JWT** on the browser → BFF → gateway so identity and authorization follow the user’s claims.
2. **Never embed gateway secrets in client bundles.** `GATEWAY_BEARER_TOKEN` is server-only ([`app/lib/config.ts`](../app/lib/config.ts)).
3. **Prefer the inbound `Authorization` bearer** over `GATEWAY_BEARER_TOKEN` so the forwarded token is always the user’s when they are signed in.
4. **Local dev:** stub gateway + `GATEWAY_BEARER_TOKEN=demo-token` without a login UI.

---

## Trust boundaries

| Zone | What it knows |
|------|----------------|
| **Browser** | **Production:** access token after login (today: optional `sessionStorage.layer_bearer_token` → `Authorization: Bearer` on `/api/chat` and `/api/feedback`). `layer_chat_session_id` is **not** auth; it is correlation for `X-Session-Id`. |
| **Next.js BFF** | Inbound `Authorization` from the browser request, plus env `GATEWAY_BASE_URL`, `GATEWAY_BEARER_TOKEN`. Builds upstream `Authorization: Bearer <resolved>` to the gateway. |
| **Gateway** | Validates bearer per `AUTH_MODE` (`stub` vs `jwt`), builds orchestrator `auth`. |

---

## Bearer resolution (BFF)

Implemented in [`app/lib/gateway-auth.ts`](../app/lib/gateway-auth.ts) as `resolveGatewayBearer(req)`:

1. If the incoming request has `Authorization: Bearer <non-empty>`, use that token for the gateway.
2. Otherwise use `GATEWAY_BEARER_TOKEN` from the environment (trimmed).

Both [`app/api/chat/route.ts`](../app/api/chat/route.ts) and [`app/api/feedback/route.ts`](../app/api/feedback/route.ts) use this helper.

| File | Notes |
|------|--------|
| [`app/lib/gateway-auth.ts`](../app/lib/gateway-auth.ts) | `resolveGatewayBearer` |
| [`app/lib/gateway-auth.test.ts`](../app/lib/gateway-auth.test.ts) | Unit tests for precedence |
| [`app/lib/config.ts`](../app/lib/config.ts) | Reads `GATEWAY_BEARER_TOKEN`, `GATEWAY_BASE_URL` |

If the resolved token is empty, the BFF returns **401** with a JSON error (before calling the gateway) so the UI can prompt for server env or client bearer.

---

## Browser → BFF: user access token

[`app/chat/page.tsx`](../app/chat/page.tsx) defines `optionalLayerBearerHeaders()`: if `sessionStorage.getItem("layer_bearer_token")` is non-empty, chat and feedback `fetch` calls include `Authorization: Bearer …`.

- **Production (per-user JWT):** after your login/SSO flow, set the user’s access token here (or migrate to cookie-based session where the BFF reads the token server-side only). The BFF **must** see a non-empty bearer for interactive users when `GATEWAY_BEARER_TOKEN` is not used as a shared dev secret.
- **Not set:** BFF uses `GATEWAY_BEARER_TOKEN` only — acceptable for **stub** dev; **avoid for real users** when the gateway is in **jwt** mode (everyone would share one service identity or hit **401** if the env token is invalid).

There is **no login/signup page** in this repository yet; production assumes you add one (or SSO) and wire the resulting access token into the pattern above.

---

## Gateway `AUTH_MODE` vs web behavior

| Gateway `AUTH_MODE` | Typical web / BFF setup | Result |
|---------------------|-------------------------|--------|
| **`jwt` (production)** | Valid **per-user** access JWT on browser `Authorization` (e.g. from `layer_bearer_token` after login) | Gateway verifies JWT; **per-user** orchestrator `auth` from claims. |
| **`jwt`** | Valid JWT only in `GATEWAY_BEARER_TOKEN`, no client bearer | Single **service** identity for all browser users (only if that matches your threat model). |
| **`jwt`** | `demo-token` or missing/invalid JWT, no client bearer | **401** from gateway (expected). |
| `stub` (local dev) | `GATEWAY_BEARER_TOKEN=demo-token`; browser often omits `Authorization` | Any non-empty upstream bearer; identity from gateway `AUTH_STUB_*`. |
| `stub` | `layer_bearer_token` set | Still stub identity; token only has to be non-empty. |

Exact JWT settings (`AUTH_JWT_*`, issuers, JWKS) are documented in **layer-gateway-api-v1** (README, `.env.example`).

---

## Configuration (server)

| Variable | Role in auth |
|----------|----------------|
| `GATEWAY_BEARER_TOKEN` | Fallback when the browser sends no bearer. **Production (per-user JWT):** often unset for interactive users so only real tokens are forwarded; use for stub dev or tightly scoped service calls. |
| `GATEWAY_BASE_URL` | Gateway origin only; not a secret. |

---

## Errors and UX

- **BFF 401 before upstream:** If `resolveGatewayBearer` is empty, neither `/api/chat` nor `/api/feedback` calls the gateway. Chat returns JSON with `error.code` `unauthorized` (`missing_gateway_bearer` in logs); feedback returns `{ error: "<message>" }` (`missing_gateway_token` in logs). Copy guides operators at `GATEWAY_BEARER_TOKEN` and optional `sessionStorage.layer_bearer_token` for JWT mode.
- **Gateway 401:** Invalid or missing bearer for `AUTH_MODE=jwt`; response is proxied according to each route’s error handling.

---

## Observability

Bearer tokens must not appear in full in structured logs. Use existing redaction/truncation in [`app/lib/web-log-payload.ts`](../app/lib/web-log-payload.ts) and avoid logging raw `Authorization` headers.

---

## Out of scope (this repo)

- **Login, signup, and SSO UI** (required in the product for production JWT per-user identity; implement with NextAuth / Auth.js / your IdP and connect to the bearer pattern above).
- Gateway-side JWT validation implementation and claim schema.
- Service-to-service auth between gateway and orchestrator (gateway concern).

---

## Implementation checklist (production JWT, per-user)

1. Gateway: **`AUTH_MODE=jwt`**, configure **`AUTH_JWT_*`** (see gateway README / `.env.example`).
2. Web: add **sign-in** (and optional sign-up) so each user receives an **access token** accepted by the gateway.
3. After sign-in, supply that token on `/api/chat` and `/api/feedback` (e.g. `sessionStorage.layer_bearer_token`, or refactor to httpOnly session read in BFF only).
4. Keep **`resolveGatewayBearer`** precedence: **client bearer first** so the gateway always sees the user’s JWT for interactive traffic.
5. Decide **`GATEWAY_BEARER_TOKEN`**: omit or restrict to non-interactive use so you do not collapse all users to one identity.
