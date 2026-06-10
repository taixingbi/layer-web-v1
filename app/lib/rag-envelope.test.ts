import { describe, expect, it } from "vitest";
import { ragNotFoundMeta } from "@/lib/rag-envelope";

describe("ragNotFoundMeta", () => {
  it("returns structured miss metadata when present", () => {
    const meta = ragNotFoundMeta({
      not_found: {
        search_summary: { chunk_count: 5, sources: ["personal_profile"] },
        result: "No references to hobbies were found.",
      },
    });
    expect(meta?.result).toContain("hobbies");
    expect(meta?.search_summary?.chunk_count).toBe(5);
  });

  it("returns null when not_found is absent", () => {
    expect(ragNotFoundMeta({ collection: "taixing_knowledge" })).toBeNull();
  });
});
