# HuntAI Web — Auth design

How the browser, Next.js BFF, and **layer-gateway-api-v1** agree on identity for `/api/chat` and `/api/feedback`. Gateway token verification and claim mapping live in the gateway repo; this document covers the **web + BFF** contract only.

Related: [design.md](design.md) (architecture), sibling [layer-gateway-api-v1 `docs/schema.md`](../../layer-gateway-api-v1/docs/schema.md), [`docs/smoke-test.md`](../../layer-gateway-api-v1/docs/smoke-test.md).

---

## Production model: Supabase session per user

Run the gateway with **`SUPABASE_URL`** and **`SUPABASE_ANON_KEY`**. Each user signs in at **`/login`** (email/password → gateway `POST /auth/login` → Supabase). The BFF stores **`access_token`** and **`refresh_token`** in httpOnly cookies and forwards **`Authorization: Bearer <access_token>`** on `/api/chat` and `/api/feedback`.

- **Browser login:** **`POST /api/auth/login`** or **`POST /api/auth/signup`** proxy to the gateway and set cookies via [`app/lib/auth-session.ts`](../app/lib/auth-session.ts) (`layer_access_token`, `layer_refresh_token`).
- **Optional dev override:** `sessionStorage.layer_bearer_token` in [`app/chat/page.tsx`](../app/chat/page.tsx) adds `Authorization: Bearer …` and **overrides** the session cookie when set.
- **No shared server bearer:** the BFF does not fall back to a global env token; unsigned requests get **401** before calling the gateway.

---

## Bearer resolution (BFF)

[`resolveGatewayBearer`](../app/lib/gateway-auth.ts):

1. Inbound `Authorization: Bearer <token>` if present.
2. Else httpOnly **`layer_access_token`** cookie ([`auth-cookie.ts`](../app/lib/auth-cookie.ts)).
3. Else empty → chat/feedback return **401** (“Sign in at /login”).

---

## Key files

| File | Role |
|------|------|
| [`app/api/auth/login/route.ts`](../app/api/auth/login/route.ts) | Email/password → gateway → session cookies |
| [`app/api/auth/signup/route.ts`](../app/api/auth/signup/route.ts) | Registration → session cookies when tokens returned |
| [`app/api/auth/logout/route.ts`](../app/api/auth/logout/route.ts) | Clears session cookies |
| [`app/lib/gateway-proxy.ts`](../app/lib/gateway-proxy.ts) | Server-side gateway JSON calls |
| [`app/lib/gateway-auth.ts`](../app/lib/gateway-auth.ts) | Bearer for upstream chat/feedback |

---

## Environment (web)

| Variable | Purpose |
|----------|---------|
| `GATEWAY_BASE_URL` | Gateway origin for BFF proxies |
| `AUTH_SESSION_MAX_AGE_SECONDS` | Cookie max-age when gateway omits `expires_in` |

See [`.env.example`](../.env.example).
