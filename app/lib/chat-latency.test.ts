/**
 * Unit tests for {@link chat-latency}.
 */

import { describe, expect, it } from "vitest";
import {
  gatewayTotalMs,
  mergeBffLatencyWithClient,
  mergeClientLatency,
  mergeGatewayLatencyWithBff,
  normalizeLatencyForDisplay,
  latencyDisplayTotalMs,
} from "./chat-latency";

const gatewaySample = {
  total: 4896,
  auth: 371,
  validation: 0,
  storage: { total: 939, write_user_message: 679, write_assistant_message: 260 },
  orchestrator: { proxy_total: 3586, workflow: { total: 3567 } },
};

describe("mergeGatewayLatencyWithBff", () => {
  it("wraps gateway latency with web.bff and route total", () => {
    const merged = mergeGatewayLatencyWithBff(gatewaySample, {
      routeMs: 5120,
      upstreamPumpMs: 5100,
    });
    expect(merged).toBeDefined();
    expect(merged!.gateway_api).toEqual(gatewaySample);
    expect(merged!.web).toEqual({
      bff: { total: 224, route: 5120, upstream_pump: 5100 },
    });
    expect(merged!.total).toBe(5120);
  });

  it("returns bff-only envelope when gateway latency missing", () => {
    const merged = mergeGatewayLatencyWithBff(null, { routeMs: 50 });
    expect(merged!.gateway_api).toEqual({});
    expect(merged!.web).toEqual({ bff: { total: 50, route: 50 } });
  });

  it("returns undefined when both gateway and route are empty", () => {
    expect(mergeGatewayLatencyWithBff(null, { routeMs: 0 })).toBeUndefined();
  });
});

describe("mergeClientLatency", () => {
  it("adds web.client and sets top total", () => {
    const partial = mergeGatewayLatencyWithBff(gatewaySample, { routeMs: 5120 })!;
    const full = mergeClientLatency(partial, 5400);
    expect(full!.web).toMatchObject({
      bff: { route: 5120 },
      client: { total: 5400 },
    });
    expect(full!.total).toBe(5400);
  });

  it("creates client-only envelope when partial missing", () => {
    const full = mergeClientLatency(undefined, 100);
    expect(full!.total).toBe(100);
    expect(full!.web).toEqual({ client: { total: 100 } });
  });
});

describe("normalizeLatencyForDisplay", () => {
  it("wraps flat gateway metadata", () => {
    const norm = normalizeLatencyForDisplay(gatewaySample);
    expect(norm!.gateway_api).toEqual(gatewaySample);
    expect(norm!.total).toBe(4896);
  });

  it("passes through already-merged envelope", () => {
    const merged = mergeGatewayLatencyWithBff(gatewaySample, { routeMs: 100 })!;
    const norm = normalizeLatencyForDisplay(merged);
    expect(norm!.web).toEqual(merged.web);
  });
});

describe("mergeBffLatencyWithClient", () => {
  it("merges client timing when t0 is set", () => {
    const partial = mergeGatewayLatencyWithBff(gatewaySample, { routeMs: 5120 })!;
    const t0 = performance.now() - 100;
    const full = mergeBffLatencyWithClient(partial, t0);
    expect(full!.web).toMatchObject({
      bff: { route: 5120 },
      client: { total: expect.any(Number) },
    });
  });

  it("returns envelope unchanged when client t0 is null", () => {
    const partial = mergeGatewayLatencyWithBff(gatewaySample, { routeMs: 100 })!;
    expect(mergeBffLatencyWithClient(partial, null)).toEqual(partial);
  });
});

describe("gatewayTotalMs and latencyDisplayTotalMs", () => {
  it("reads gateway and display totals", () => {
    expect(gatewayTotalMs(gatewaySample)).toBe(4896);
    const merged = mergeClientLatency(
      mergeGatewayLatencyWithBff(gatewaySample, { routeMs: 5120 }),
      5400,
    );
    expect(latencyDisplayTotalMs(merged!)).toBe(5400);
  });
});
