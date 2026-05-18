import { config } from "@/lib/config";

export type GatewayJsonResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
};

export async function gatewayJson(
  path: string,
  init?: RequestInit,
): Promise<GatewayJsonResult> {
  const url = `${config.gatewayBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { detail: text };
    }
  }
  return { ok: res.ok, status: res.status, data };
}
