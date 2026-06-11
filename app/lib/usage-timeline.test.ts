import { describe, expect, it } from "vitest";
import { formatUsageLine } from "./usage-timeline";

describe("formatUsageLine", () => {
  it("formats tokens and estimated cost on one line", () => {
    const line = formatUsageLine("Router", 576, 0.0002);
    expect(line).toContain("Router");
    expect(line).toContain("576 tok");
    expect(line).toContain("$0.0002");
    expect(line).not.toContain("ms");
  });

  it("omits metrics when tokens are zero", () => {
    const line = formatUsageLine("Embed", 0, 0, { connector: "├─ " });
    expect(line).toBe("├─ Embed");
    expect(line).not.toContain("tok");
    expect(line).not.toContain("$");
  });
});
