import { afterEach, describe, expect, it, vi } from "vitest";
import { easternNowIsoSeconds, logWebEvent } from "./server-log";

describe("server-log", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("easternNowIsoSeconds matches YYYY-MM-DDTHH:mm:ss±HH:mm shape", () => {
    const s = easternNowIsoSeconds(new Date("2026-07-15T12:00:00Z"));
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it("logWebEvent emits gateway-style key order on stdout", () => {
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
    });

    const row = JSON.parse(lines[0].trim()) as Record<string, unknown>;
    expect(Object.keys(row).slice(0, 8)).toEqual([
      "ts",
      "level",
      "message",
      "event",
      "service",
      "request_id",
      "trace_id",
      "path",
    ]);
    expect(row.message).toBe("request_received");
    expect(row.event).toBe("request_received");
    expect(row.service).toBe("huntai-web");
    expect(row.level).toBe("INFO");
  });
});
