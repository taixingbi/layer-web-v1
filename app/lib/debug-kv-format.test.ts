import { describe, expect, it } from "vitest";
import { formatDebugKvLine } from "./debug-kv-format";

describe("formatDebugKvLine", () => {
  it("pads labels with dots", () => {
    expect(formatDebugKvLine("Route", "rag_private_kb")).toBe(
      "Route ............... rag_private_kb",
    );
    expect(formatDebugKvLine("Retrieve", "40 → 10 → 5 chunks")).toBe(
      "Retrieve ............ 40 → 10 → 5 chunks",
    );
  });
});
