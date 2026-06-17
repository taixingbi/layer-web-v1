import { describe, expect, it } from "vitest";

import { summarizeReadyBody, summarizeServiceProbe } from "@/lib/admin/service-health-summary";

describe("summarizeReadyBody", () => {
  it("summarizes orchestrator dependency failures", () => {
    expect(
      summarizeReadyBody({
        status: "degraded",
        dependencies: {
          llm: { ok: false, error: "invalid_json" },
          rag: { ok: true },
        },
      }),
    ).toBe("llm: invalid_json");
  });

  it("summarizes inference gateway unhealthy backends", () => {
    expect(
      summarizeReadyBody({
        status: "degraded",
        healthy_backends: 1,
        total_backends: 2,
        backends: { "gpu-node-1": "unhealthy", "gpu-node-2": "healthy" },
      }),
    ).toBe("gpu-node-1: unhealthy");
  });

  it("reads string detail", () => {
    expect(summarizeReadyBody({ detail: "orchestrator not ready" })).toBe("orchestrator not ready");
  });
});

describe("summarizeServiceProbe", () => {
  it("prefers ready failure summary over health detail", () => {
    expect(
      summarizeServiceProbe({
        healthOk: true,
        readyOk: false,
        healthDetail: null,
        healthBody: { status: "ok" },
        readyBody: {
          dependencies: { llm: { ok: false, error: "timeout" } },
        },
      }),
    ).toBe("llm: timeout");
  });
});
