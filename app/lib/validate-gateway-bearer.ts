import { config } from "@/lib/config";

export type GatewayBearerProbeResult =
  | { ok: true; gatewayStatus: number }
  | { ok: false; gatewayStatus: number; message: string };

/**
 * Check whether the gateway accepts this bearer (401 = rejected).
 * Uses a minimal POST /api/feedback body; non-401 means auth middleware passed
 * (may still be 400/422/501/502 from business logic).
 */
export async function probeGatewayBearer(token: string): Promise<GatewayBearerProbeResult> {
  const url = `${config.gatewayBaseUrl}/api/feedback`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trace_id: "auth-probe", rating: "thumbs_up" }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      gatewayStatus: 0,
      message: `Could not reach gateway at ${config.gatewayBaseUrl}: ${msg}`,
    };
  }

  if (res.status === 401) {
    let detail = "Gateway rejected this token (401). Use a valid JWT when AUTH_MODE=jwt, or demo-token with stub auth.";
    try {
      const j = (await res.json()) as { error?: { message?: string }; detail?: string };
      if (j.error?.message) detail = j.error.message;
      else if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* keep default */
    }
    return { ok: false, gatewayStatus: 401, message: detail };
  }

  return { ok: true, gatewayStatus: res.status };
}

export function shouldValidateTokenOnLogin(): boolean {
  const raw = process.env.AUTH_VALIDATE_TOKEN_ON_LOGIN?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return true;
}
