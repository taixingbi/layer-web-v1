# huntAI Web — Auth design

How the browser, Next.js BFF, and **layer-gateway-api-v1** agree on identity for `/api/chat` and `/api/feedback`. Gateway token verification and claim mapping live in the gateway repo; this document covers the **web + BFF** contract only.

Related: [design.md](design.md) (architecture), sibling [layer-gateway-api-v1 `docs/schema.md`](../../layer-gateway-api-v1/docs/schema.md), [`docs/smoke-test.md`](../../layer-gateway-api-v1/docs/smoke-test.md).

---

## Target production model: JWT, per-user identity

In **production**, run the gateway with **`AUTH_MODE=jwt`**. Each end user must present their own **short-lived access token** on calls to this app’s `/api/chat` and `/api/feedback` so the BFF forwards **`Authorization: Bearer <user_jwt>`** to the gateway and the orchestrator receives **claims-derived `auth` per user**.

- **Primary browser login (this repo):** open **`/login`**, paste a gateway-accepted **access token** (JWT when the gateway uses `AUTH_MODE=jwt`). The app calls **`POST /api/auth/session`** with `{ "access_token": "<token>" }`, which sets an **httpOnly** cookie [`layer_access_token`](../app/lib/auth-cookie.ts). Same-origin `fetch` to `/api/chat` and `/api/feedback` sends that cookie; the BFF reads it in **`resolveGatewayBearer`** (before `GATEWAY_BEARER_TOKEN`). **Optional:** env **`AUTH_DEMO_EMAIL`**, **`AUTH_DEMO_PASSWORD`**, **`AUTH_DEMO_ACCESS_TOKEN`** enables a small **demo** form on `/login` for local testing only.
- **Legacy / dev override:** `sessionStorage.layer_bearer_token` still adds `Authorization: Bearer …` from [`app/chat/page.tsx`](../app/chat/page.tsx); that header **wins** over the session cookie when both are present.
- **`GATEWAY_BEARER_TOKEN`** in production is often **empty or unused** for interactive chat so anonymous traffic cannot impersonate a user; if set, it is only used when the browser sends **no** `Authorization` header **and** no session cookie (service or break-glass paths).

**Local development** often uses gateway **`AUTH_MODE=stub`** and `GATEWAY_BEARER_TOKEN=demo-token` with no browser bearer (see matrix below).

---

## Goals

1. **Production: per-user JWT** on the browser → BFF → gateway so identity and authorization follow the user’s claims.
2. **Never embed gateway secrets in client bundles.** `GATEWAY_BEARER_TOKEN` is server-only ([`app/lib/config.ts`](../app/lib/config.ts)).
3. **Prefer the inbound `Authorization` bearer**, then the **session cookie**, over `GATEWAY_BEARER_TOKEN` so the forwarded token reflects the signed-in user when possible.
4. **Local dev:** stub gateway + `GATEWAY_BEARER_TOKEN=demo-token` without a login UI.

---

## Trust boundaries

| Zone | What it knows |
|------|----------------|
| **Browser** | **Signed in:** httpOnly **`layer_access_token`** cookie (from **`/login`**) sent on same-origin `/api/*`; optional **`sessionStorage.layer_bearer_token`** → `Authorization` (overrides cookie). **`layer_chat_session_id`** is correlation only (`X-Session-Id`). |
| **Next.js BFF** | Inbound `Authorization`, cookies, and env `GATEWAY_BASE_URL`, `GATEWAY_BEARER_TOKEN`. Builds upstream `Authorization: Bearer <resolved>` to the gateway. |
| **Gateway** | Validates bearer per `AUTH_MODE` (`stub` vs `jwt`), builds orchestrator `auth`. |

---

## Bearer resolution (BFF)

Implemented in [`app/lib/gateway-auth.ts`](../app/lib/gateway-auth.ts) as `resolveGatewayBearer(req)`:

1. If the incoming request has `Authorization: Bearer <non-empty>`, use that token for the gateway.
2. Else if the **httpOnly** session cookie `layer_access_token` is present and non-empty, use it ([`app/lib/auth-cookie.ts`](../app/lib/auth-cookie.ts)).
3. Otherwise use `GATEWAY_BEARER_TOKEN` from the environment (trimmed).

Both [`app/api/chat/route.ts`](../app/api/chat/route.ts) and [`app/api/feedback/route.ts`](../app/api/feedback/route.ts) use this helper.

| File | Notes |
|------|--------|
| [`app/lib/gateway-auth.ts`](../app/lib/gateway-auth.ts) | `resolveGatewayBearer` |
| [`app/lib/gateway-auth.test.ts`](../app/lib/gateway-auth.test.ts) | Unit tests for precedence |
| [`app/lib/auth-cookie.ts`](../app/lib/auth-cookie.ts) | Cookie name + read helper |
| [`app/api/auth/session/route.ts`](../app/api/auth/session/route.ts) | `POST` sets session cookie from JSON `access_token` |
| [`app/api/auth/logout/route.ts`](../app/api/auth/logout/route.ts) | `POST` clears session cookie |
| [`app/login/page.tsx`](../app/login/page.tsx) | Browser sign-in UI |
| [`app/lib/config.ts`](../app/lib/config.ts) | Reads `GATEWAY_BEARER_TOKEN`, `GATEWAY_BASE_URL`, `AUTH_SESSION_MAX_AGE_SECONDS` |

If the resolved token is empty, the BFF returns **401** with a JSON error (before calling the gateway) so the UI can prompt for server env or client bearer.

---

## Browser → BFF: session cookie and optional header

- **`/login`:** user pastes an **access token**; **`POST /api/auth/session`** stores it in an **httpOnly** cookie (duration from **`AUTH_SESSION_MAX_AGE_SECONDS`**, default 8 hours). **`POST /api/auth/logout`** clears it. **`GET /api/auth/me`** returns `{ signedIn: true }` when the cookie is present (no token in the response body).
- **[`app/chat/page.tsx`](../app/chat/page.tsx)** `optionalLayerBearerHeaders()`: if `sessionStorage.layer_bearer_token` is set, requests also send `Authorization: Bearer …`, which **overrides** the cookie for `resolveGatewayBearer`.
- **Stub dev:** omit sign-in; the BFF uses **`GATEWAY_BEARER_TOKEN`** when there is no header and no cookie.

**Optional demo password login (local only):** set **`AUTH_DEMO_EMAIL`**, **`AUTH_DEMO_PASSWORD`**, and **`AUTH_DEMO_ACCESS_TOKEN`** on the server. **`POST /api/auth/demo`** validates email/password and sets the cookie to `AUTH_DEMO_ACCESS_TOKEN`. Do not use real production passwords in env files committed to git.

Full **OIDC / NextAuth** with your IdP is still a separate integration: use this app’s cookie or header contract after your IdP returns an access token the gateway accepts.

---

## Gateway `AUTH_MODE` vs web behavior

| Gateway `AUTH_MODE` | Typical web / BFF setup | Result |
|---------------------|-------------------------|--------|
| **`jwt` (production)** | Per-user JWT in **session cookie** from `/login`, or `Authorization` from `layer_bearer_token` after your IdP flow | Gateway verifies JWT; **per-user** orchestrator `auth`. |
| **`jwt`** | Valid JWT only in `GATEWAY_BEARER_TOKEN`, no client bearer | Single **service** identity for all browser users (only if that matches your threat model). |
| **`jwt`** | `demo-token` or missing/invalid JWT, no client bearer | **401** from gateway (expected). |
| `stub` (local dev) | `GATEWAY_BEARER_TOKEN=demo-token`; browser often omits `Authorization` | Any non-empty upstream bearer; identity from gateway `AUTH_STUB_*`. |
| `stub` | `layer_bearer_token` set | Still stub identity; token only has to be non-empty. |

Exact JWT settings (`AUTH_JWT_*`, issuers, JWKS) are documented in **layer-gateway-api-v1** (README, `.env.example`).

---

## Configuration (server)

| Variable | Role in auth |
|----------|----------------|
| `GATEWAY_BEARER_TOKEN` | Fallback when there is no `Authorization` bearer and no session cookie. |
| `GATEWAY_BASE_URL` | Gateway origin only; not a secret. |
| `AUTH_SESSION_MAX_AGE_SECONDS` | Max-Age (seconds) for `layer_access_token` cookie (default 28800, max 30 days). |
| `AUTH_DEMO_*` | Optional demo email/password/token for `/login` (local testing). |

---

## Errors and UX

- **BFF 401 before upstream:** If `resolveGatewayBearer` is empty, neither `/api/chat` nor `/api/feedback` calls the gateway. Chat returns JSON with `error.code` `unauthorized` (`missing_gateway_bearer` in logs); feedback returns `{ error: "<message>" }` (`missing_gateway_token` in logs). Sign in at **`/login`** or set `GATEWAY_BEARER_TOKEN` / `sessionStorage.layer_bearer_token` as appropriate.
- **Gateway 401:** Invalid or missing bearer for `AUTH_MODE=jwt`; response is proxied according to each route’s error handling.

---

## Observability

Bearer tokens must not appear in full in structured logs. Use existing redaction/truncation in [`app/lib/web-log-payload.ts`](../app/lib/web-log-payload.ts) and avoid logging raw `Authorization` headers.

---

## Out of scope (this repo)

- **Full OIDC / OAuth provider integration** (Google, Okta, Auth0 hosted UI, etc.): obtain an access token from your IdP, then either paste it at **`/login`** or set the session cookie / header from your own callback route.
- Gateway-side JWT validation implementation and claim schema.
- Service-to-service auth between gateway and orchestrator (gateway concern).

---

## Implementation checklist (production JWT, per-user)

1. Gateway: **`AUTH_MODE=jwt`**, configure **`AUTH_JWT_*`** (see gateway README / `.env.example`).
2. Web: have users **sign in at `/login`** with an access token your gateway accepts, **or** integrate your IdP and call **`POST /api/auth/session`** from your own UI after token issuance.
3. Prefer **httpOnly cookie** (this app’s default after `/login`) or keep **`Authorization`** from `sessionStorage` / your client; header wins over cookie when both are set.
4. Keep **`resolveGatewayBearer`** precedence for interactive traffic.
5. Decide **`GATEWAY_BEARER_TOKEN`**: omit or restrict to non-interactive use so you do not collapse all users to one identity.
