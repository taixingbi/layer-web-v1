import { describe, expect, it } from "vitest";

import { isAdminProfile } from "@/lib/admin/auth";
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
