# huntAI Web — Auth design

How the browser, Next.js BFF, and **layer-gateway-api-v1** agree on identity for `/api/chat` and `/api/feedback`. Gateway token verification and claim mapping live in the gateway repo; this document covers the **web + BFF** contract only.

Related: [design.md](design.md) (architecture), sibling [layer-gateway-api-v1 `docs/schema.md`](../../layer-gateway-api-v1/docs/schema.md), [`docs/smoke-test.md`](../../layer-gateway-api-v1/docs/smoke-test.md).

---

## Goals

1. **Never embed gateway secrets in client bundles.** `GATEWAY_BEARER_TOKEN` is server-only (`app/lib/config.ts`).
2. **Prefer the caller’s bearer** when present so a logged-in user (future OIDC) can send a short-lived access token from the browser without the server minting it.
3. **Keep local dev simple:** empty or missing browser bearer + `GATEWAY_BEARER_TOKEN=demo-token` against gateway `AUTH_MODE=stub`.

---

## Trust boundaries

| Zone | What it knows |
|------|----------------|
| **Browser** | Optional `sessionStorage.layer_bearer_token` (forwarded as `Authorization` on same-origin `/api/*` only if set). `layer_chat_session_id` is **not** auth; it is correlation for `X-Session-Id`. |
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

## Browser → BFF: optional user token

[`app/chat/page.tsx`](../app/chat/page.tsx) defines `optionalLayerBearerHeaders()`: if `sessionStorage.getItem("layer_bearer_token")` is non-empty, chat and feedback `fetch` calls include `Authorization: Bearer …`.

- **Not set:** BFF uses `GATEWAY_BEARER_TOKEN` only (typical local stub).
- **Set:** That value is forwarded to the BFF and wins over `GATEWAY_BEARER_TOKEN` for upstream resolution.

There is **no sign-in page** in this repository; `layer_bearer_token` is a **manual or future OIDC** hook (e.g. set after NextAuth session in a later change).

---

## Gateway `AUTH_MODE` vs web behavior

| Gateway `AUTH_MODE` | Typical web / BFF setup | Result |
|---------------------|-------------------------|--------|
| `stub` | `GATEWAY_BEARER_TOKEN=demo-token`; browser often omits `Authorization` | Gateway accepts any non-empty bearer; identity from gateway stub env (`AUTH_STUB_*`). |
| `stub` | `layer_bearer_token` set in the browser | Same stub identity on the gateway; forwarded token is still “any non-empty bearer” for stub. |
| `jwt` | Valid access JWT in `layer_bearer_token` **or** in `GATEWAY_BEARER_TOKEN` | Gateway verifies JWT and passes claims-derived `auth` downstream. |
| `jwt` | Only `demo-token` / no real JWT, no client bearer | **401** from gateway (expected). |

Exact JWT settings (`AUTH_JWT_*`, issuers, JWKS) are documented in **layer-gateway-api-v1** (README, `.env.example`).

---

## Configuration (server)

| Variable | Role in auth |
|----------|----------------|
| `GATEWAY_BEARER_TOKEN` | Fallback bearer when the browser does not send a non-empty `Authorization: Bearer`. |
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

- OIDC / NextAuth (or other) login UI and session cookies.
- Gateway-side JWT validation implementation and claim schema.
- Service-to-service auth between gateway and orchestrator (gateway concern).

---

## Future direction (recommended)

1. Add an OIDC provider + NextAuth (or Auth.js) with a session or access token.
2. On session ready, set `sessionStorage.setItem("layer_bearer_token", access_token)` (or switch to httpOnly cookie + server-only upstream if you want zero token in JS).
3. Keep `resolveGatewayBearer` precedence: user bearer first preserves per-user identity on the gateway under `AUTH_MODE=jwt`.
