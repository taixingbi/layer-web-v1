import { describe, expect, it } from "vitest";

import {
  goldDatasetRepoUrl,
  goldFileMeta,
  formatGoldFileBytes,
} from "@/lib/admin/rag-gold-dataset";

describe("goldFileMeta", () => {
  it("maps known gold filenames to labels", () => {
    expect(goldFileMeta("easy_single_hop.jsonl").label).toBe("Easy single-hop");
    expect(goldFileMeta("multi_hop.jsonl").bucket).toBe("multi_hop");
    expect(goldFileMeta("nagative.jsonl").label).toBe("Negative");
  });
});

describe("goldDatasetRepoUrl", () => {
  it("returns dev and prod tree URLs", () => {
    expect(goldDatasetRepoUrl("dev")).toContain("data_dev/gold_dataset");
    expect(goldDatasetRepoUrl("prod")).toContain("data_prod/gold_dataset");
  });
});

describe("formatGoldFileBytes", () => {
  it("formats sizes", () => {
    expect(formatGoldFileBytes(500)).toBe("500 B");
    expect(formatGoldFileBytes(2048)).toBe("2.0 KB");
  });
});
