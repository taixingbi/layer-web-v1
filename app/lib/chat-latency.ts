/**
 * Merge gateway ``latency_ms`` with web BFF and browser client timings for chat UI.
 */

import { msSince } from "@/lib/timing";

export type LatencyObject = Record<string, unknown>;

function roundMs(value: number): number {
  return Math.round(value);
}

/** True when value is a plain object suitable for latency envelopes. */
export function isLatencyObject(value: unknown): value is LatencyObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read ``total`` from a gateway latency object (ms). */
export function gatewayTotalMs(gatewayApi: LatencyObject | undefined): number {
  if (!gatewayApi) return 0;
  const total = gatewayApi.total;
  return typeof total === "number" && Number.isFinite(total) ? roundMs(total) : 0;
}

function isGatewayFlatLatency(obj: LatencyObject): boolean {
  return (
    "gateway_api" in obj ||
    "web" in obj ||
    ("auth" in obj || "validation" in obj || "storage" in obj || "orchestrator" in obj)
  );
}

/**
 * Wrap legacy flat gateway ``latency_ms`` (from DB metadata) for display.
 */
export function normalizeLatencyForDisplay(raw: unknown): LatencyObject | undefined {
  if (!isLatencyObject(raw)) return undefined;
  if ("gateway_api" in raw || "web" in raw) {
    return { ...raw };
  }
  if (isGatewayFlatLatency(raw)) {
    return { gateway_api: { ...raw }, total: gatewayTotalMs(raw) };
  }
  return { ...raw };
}

export type BffLatencyInput = {
  routeMs: number;
  upstreamPumpMs?: number;
};

/**
 * Build partial envelope: passthrough ``gateway_api`` + ``web.bff`` (client merged later).
 */
export function mergeGatewayLatencyWithBff(
  gatewayLatency: unknown,
  bff: BffLatencyInput,
): LatencyObject | undefined {
  const route = roundMs(bff.routeMs);
  if (!isLatencyObject(gatewayLatency) && route <= 0) {
    return undefined;
  }

  const gatewayApi = isLatencyObject(gatewayLatency) ? { ...gatewayLatency } : {};
  const gwTotal = gatewayTotalMs(gatewayApi);
  const bffTotal = Math.max(0, route - gwTotal);

  const webBff: LatencyObject = {
    total: bffTotal,
    route,
  };
  if (typeof bff.upstreamPumpMs === "number" && Number.isFinite(bff.upstreamPumpMs)) {
    webBff.upstream_pump = roundMs(bff.upstreamPumpMs);
  }

  const out: LatencyObject = {
    total: route,
    gateway_api: gatewayApi,
    web: { bff: webBff },
  };
  return out;
}

/**
 * Add ``web.client`` and set top-level ``total`` to browser E2E ms.
 */
export function mergeClientLatency(
  envelope: LatencyObject | undefined,
  clientMs: number,
): LatencyObject | undefined {
  const clientTotal = roundMs(clientMs);
  if (!envelope && clientTotal <= 0) return undefined;

  const base: LatencyObject = envelope ? { ...envelope } : { gateway_api: {} };
  const web = isLatencyObject(base.web) ? { ...base.web } : {};
  web.client = { total: clientTotal };
  base.web = web;
  base.total = clientTotal;
  return base;
}

/** Merge BFF ``latency_ms`` envelope with browser E2E timing when ``clientT0`` is set. */
export function mergeBffLatencyWithClient(
  raw: unknown,
  clientT0: number | null,
): LatencyObject | undefined {
  if (!isLatencyObject(raw)) return undefined;
  if (clientT0 == null) return raw;
  return mergeClientLatency(raw, msSince(clientT0)) ?? undefined;
}

/** Top-level display total (ms). */
export function latencyDisplayTotalMs(latency: LatencyObject | undefined): number | null {
  if (!latency) return null;
  const web = latency.web;
  if (isLatencyObject(web)) {
    const client = web.client;
    if (isLatencyObject(client) && typeof client.total === "number") {
      return roundMs(client.total);
    }
    const bff = web.bff;
    if (isLatencyObject(bff) && typeof bff.route === "number") {
      return roundMs(bff.route);
    }
  }
  if (typeof latency.total === "number") return roundMs(latency.total);
  const gw = latency.gateway_api;
  if (isLatencyObject(gw)) return gatewayTotalMs(gw) || null;
  return gatewayTotalMs(latency) || null;
}
