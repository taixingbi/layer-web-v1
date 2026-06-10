import { describe, expect, it } from "vitest";

import { isAdminProfile } from "@/lib/admin/auth";
import {
  canonicalGpuKey,
  collectGpuKeys,
  dcgmMibToGb,
  dcgmRawToMib,
  dcgmTotalMib,
  indexPromSamples,
  lookupPromSample,
} from "@/lib/admin/gpu-metrics";
import { buildLogql } from "@/lib/admin/loki";
import { parsePromScalar, routeDistributionFromVector } from "@/lib/admin/prometheus";

describe("isAdminProfile", () => {
  it("returns true when roles include admin", () => {
    expect(isAdminProfile({ id: "1", roles: ["engineer", "admin"] })).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAdminProfile({ id: "1", roles: ["Admin"] })).toBe(true);
  });

  it("returns false for non-admin users", () => {
    expect(isAdminProfile({ id: "1", roles: ["engineer"] })).toBe(false);
    expect(isAdminProfile({ id: "1" })).toBe(false);
  });
});

describe("routeDistributionFromVector", () => {
  it("converts counter vector to percentages", () => {
    const out = routeDistributionFromVector([
      { metric: { route: "rag_private_kb" }, value: [0, "620"] },
      { metric: { route: "github_search" }, value: [0, "210"] },
      { metric: { route: "web_search" }, value: [0, "170"] },
    ]);
    expect(out.rag_private_kb).toBe(62);
    expect(out.github_search).toBe(21);
    expect(out.web_search).toBe(17);
  });
});

describe("gpuAliasKeys", () => {
  it("joins util and FB samples when only FB has UUID", () => {
    const uuid = "GPU-604ac76c-d9cf-fef3-62e9-d92044ab6e52";
    const util = { kubernetes_node: "gpu-node-1", gpu: "0", Hostname: "gpu-node-1" };
    const fb = { UUID: uuid, gpu: "0", Hostname: "gpu-node-1" };
    const usedMap = indexPromSamples([{ metric: fb, value: [0, "18432"] }]);
    expect(lookupPromSample(usedMap, util)?.value[1]).toBe("18432");
  });
});

describe("canonicalGpuKey", () => {
  it("prefers UUID", () => {
    expect(canonicalGpuKey({ UUID: "GPU-abc", gpu: "0" })).toBe("uuid:GPU-abc");
  });

  it("separates two nodes with gpu=0", () => {
    expect(collectGpuKeys(
      [{ metric: { kubernetes_node: "gpu-node-1", gpu: "0" }, value: [0, "1"] }],
      [{ metric: { kubernetes_node: "gpu-node-2", gpu: "0" }, value: [0, "2"] }],
    )).toHaveLength(2);
  });
});

describe("dcgmTotalMib", () => {
  it("falls back to used + free when TOTAL is missing", () => {
    expect(dcgmTotalMib(8192, 16384, Number.NaN)).toBe(24576);
  });
});

describe("dcgmRawToMib", () => {
  it("treats large values as bytes", () => {
    expect(dcgmRawToMib(24 * 1024 ** 3)).toBeCloseTo(24576, 0);
  });
});

describe("dcgmMibToGb", () => {
  it("converts MiB to GiB", () => {
    expect(dcgmMibToGb(20480)).toBe(20);
  });
});

describe("buildLogql", () => {
  it("builds selector with cluster namespace app", () => {
    const q = buildLogql({
      namespace: "ai-dev",
      app: "layer-orchestrator",
      sinceMs: 900_000,
    });
    expect(q).toContain('cluster="k3s"');
    expect(q).toContain('namespace="ai-dev"');
    expect(q).toContain('app="layer-orchestrator"');
    expect(q).toContain("| json");
  });

  it("adds level and search filters", () => {
    const q = buildLogql({
      namespace: "ai-dev",
      app: "layer-rag-query",
      level: "error",
      search: "req_abc",
      sinceMs: 900_000,
    });
    expect(q).toContain('level=~"ERROR|error"');
    expect(q).toContain('|= "req_abc"');
  });
});

describe("parsePromScalar", () => {
  it("reads first scalar sample", () => {
    expect(
      parsePromScalar({
        status: "success",
        data: { result: [{ metric: {}, value: [1710000000, "148.2"] }] },
      }),
    ).toBe(148.2);
  });

  it("returns null when empty", () => {
    expect(parsePromScalar({ status: "success", data: { result: [] } })).toBeNull();
  });
});
