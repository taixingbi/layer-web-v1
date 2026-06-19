import { describe, expect, it } from "vitest";

import { formatGuestHistoryLatency } from "@/lib/guest-history-latency";

describe("formatGuestHistoryLatency", () => {
  it("reads gateway envelope total", () => {
    expect(
      formatGuestHistoryLatency({
        total: 4896,
        auth: 371,
        orchestrator: { proxy_total: 3586, workflow: { total: 3567 } },
      }),
    ).toBe("4896ms");
  });

  it("reads legacy total_ms when present", () => {
    expect(formatGuestHistoryLatency({ total_ms: 42 })).toBe("42ms");
  });

  it("returns em dash when missing or invalid", () => {
    expect(formatGuestHistoryLatency(null)).toBe("—");
    expect(formatGuestHistoryLatency(undefined)).toBe("—");
    expect(formatGuestHistoryLatency({ auth: 1 })).toBe("—");
  });
});
