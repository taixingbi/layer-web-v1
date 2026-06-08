import { describe, expect, it } from "vitest";

import { isAdminProfile } from "@/lib/admin/auth";
import { collectGpuKeys, dcgmMibToGb, dcgmTotalMib, gpuDeviceKey } from "@/lib/admin/gpu-metrics";
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

describe("gpuDeviceKey", () => {
  it("prefers UUID so FB_USED and GPU_UTIL samples join", () => {
    const uuid = "GPU-604ac76c-d9cf-fef3-62e9-d92044ab6e52";
    expect(gpuDeviceKey({ UUID: uuid, gpu: "0", kubernetes_node: "gpu-node-1" })).toBe(`uuid:${uuid}`);
  });

  it("keys by node and gpu index when UUID is absent", () => {
    const a = gpuDeviceKey({ kubernetes_node: "gpu-node-1", gpu: "0" });
    const b = gpuDeviceKey({ kubernetes_node: "gpu-node-2", gpu: "0" });
    expect(a).not.toBe(b);
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

describe("dcgmMibToGb", () => {
  it("converts MiB to GiB", () => {
    expect(dcgmMibToGb(20480)).toBe(20);
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
