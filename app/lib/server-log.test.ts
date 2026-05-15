import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LOG_FIELD_PRIORITY,
  WEB_LOGGER,
  easternNowIsoSeconds,
  logWebEvent,
  messageForEvent,
  phaseForEvent,
} from "./server-log";

describe("server-log", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("easternNowIsoSeconds matches gateway-style timestamp", () => {
    const s = easternNowIsoSeconds(new Date("2026-07-15T12:00:00Z"));
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it("phase and message match gateway event map", () => {
    expect(phaseForEvent("request_received")).toBe("ingress");
    expect(phaseForEvent("gateway_response")).toBe("upstream");
    expect(phaseForEvent("request_complete")).toBe("access");
    expect(messageForEvent("request_complete")).toBe("Request complete");
  });

  it("logWebEvent emits gateway-compatible leading keys", () => {
    const lines: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });

    logWebEvent("request_received", "INFO", {
      path: "/api/chat",
      method: "POST",
      request_id: "req_1",
      trace_id: "tr_1",
      session_id: "sess_1",
      conversation_id: "conv_1",
    });

    const row = JSON.parse(lines[0].trim()) as Record<string, unknown>;
    const prefix = LOG_FIELD_PRIORITY.filter((k) => k in row);
    expect(Object.keys(row).slice(0, prefix.length)).toEqual(prefix);
    expect(row.ts).toBeTruthy();
    expect(row.level).toBe("INFO");
    expect(row.logger).toBe(WEB_LOGGER);
    expect(row.phase).toBe("ingress");
    expect(row.event).toBe("request_received");
    expect(row.message).toBe("Request received");
    expect(row.service).toBe("huntai-web");
    expect(row.request_id).toBe("req_1");
    expect(row.session_id).toBe("sess_1");
    expect(row.conversation_id).toBe("conv_1");
  });

  it("logWebEvent request_complete uses access phase", () => {
    const lines: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });

    logWebEvent("request_complete", "INFO", {
      path: "/api/chat",
      method: "POST",
      backend: "gateway",
      status: 200,
      latency_ms: 42.5,
      stream: true,
    });

    const row = JSON.parse(lines[0].trim()) as Record<string, unknown>;
    expect(row.phase).toBe("access");
    expect(row.message).toBe("Request complete");
    expect(row.status).toBe(200);
    expect(row.stream).toBe(true);
  });
});
