/**
 * Server-side config for API routes (gateway only). Do not import from client components.
 */

function fromEnv(name: string, fallback: string): string {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const trimmed = v.split("#")[0].trim().replace(/^["']|["']$/g, "").trim();
  return trimmed || fallback;
}

let cachedGatewayBaseUrl: string | null = null;

export const config = {
  /** layer-gateway-api-v1 origin (no trailing slash). Default matches local gateway in docs/smoke-test.md */
  get gatewayBaseUrl(): string {
    if (cachedGatewayBaseUrl === null) {
      cachedGatewayBaseUrl = fromEnv("GATEWAY_BASE_URL", "http://localhost:8000").replace(/\/$/, "");
    }
    return cachedGatewayBaseUrl;
  },

  /**
   * Fallback bearer when the inbound request has no `Authorization: Bearer` (server-only).
   * Production (per-user JWT): prefer user token from the client; leave unset or use only for
   * service paths — do not use one shared secret for all humans unless intentional. Dev stub: e.g. `demo-token`.
   */
  get gatewayBearerToken(): string {
    return fromEnv("GATEWAY_BEARER_TOKEN", "demo-token");
  },

  /** Value for structured log field ``service`` (BFF / Next.js server). */
  get webServiceName(): string {
    return fromEnv("WEB_SERVICE_NAME", "huntai-web");
  },
};
