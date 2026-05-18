/**
 * Server-side config for API routes (gateway only). Do not import from client components.
 */

function fromEnv(name: string, fallback: string): string {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const trimmed = v.split("#")[0].trim().replace(/^["']|["']$/g, "").trim();
  return trimmed || fallback;
}

function intEnv(name: string, fallback: number, max: number): number {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
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

  /** Value for structured log field ``service`` (BFF / Next.js server). */
  get webServiceName(): string {
    return fromEnv("WEB_SERVICE_NAME", "huntai-web");
  },

  /** Max-Age (seconds) for httpOnly `layer_access_token` after browser login. Default 8h, max 30d. */
  get authSessionMaxAgeSeconds(): number {
    return intEnv("AUTH_SESSION_MAX_AGE_SECONDS", 28_800, 86400 * 30);
  },

  /** Public web origin (no trailing slash). Must match gateway FRONTEND_URL and Supabase Site URL. */
  get appUrl(): string {
    return fromEnv("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  },
};
