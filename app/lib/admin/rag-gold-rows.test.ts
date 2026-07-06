import { describe, expect, it } from "vitest";

import {
  normalizeGoldEvalEnv,
  normalizeGoldFilename,
  paginateGoldRows,
  parseGoldJsonlLine,
  parseGoldJsonlText,
  parseGoldRowsQueryParams,
} from "@/lib/admin/rag-gold-rows";

const SAMPLE_LINE = JSON.stringify({
  id: "abc",
  question: "What is Taixing Bi's role?",
  answer: "AI Infrastructure Engineer",
  expected_behavior: "answer",
  eval_bucket: "easy_single_hop",
  must_contain: ["AI", "Engineer"],
  source: "personal_profile",
  doc_type: "personal_profile",
  case_type: "single_hop",
});

describe("normalizeGoldEvalEnv", () => {
  it("accepts dev and prod", () => {
    expect(normalizeGoldEvalEnv("dev")).toBe("dev");
    expect(normalizeGoldEvalEnv("PROD")).toBe("prod");
    expect(normalizeGoldEvalEnv("staging")).toBeNull();
  });
});

describe("normalizeGoldFilename", () => {
  it("accepts jsonl basenames only", () => {
    expect(normalizeGoldFilename("easy_single_hop.jsonl")).toBe("easy_single_hop.jsonl");
    expect(normalizeGoldFilename("../secret.jsonl")).toBeNull();
    expect(normalizeGoldFilename("file.txt")).toBeNull();
  });
});

describe("parseGoldJsonlText", () => {
  it("parses rows", () => {
    const rows = parseGoldJsonlText(`${SAMPLE_LINE}\n\n`);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.question).toContain("Taixing");
    expect(rows[0]?.mustContain).toEqual(["AI", "Engineer"]);
  });
});

describe("parseGoldJsonlLine", () => {
  it("requires question field", () => {
    expect(parseGoldJsonlLine(JSON.stringify({ answer: "x" }), 1)).toBeNull();
  });
});

describe("paginateGoldRows", () => {
  const rows = parseGoldJsonlText(
    [
      JSON.stringify({ question: "alpha question" }),
      JSON.stringify({ question: "beta question" }),
      JSON.stringify({ question: "gamma question" }),
    ].join("\n"),
  );

  it("filters and paginates", () => {
    const page = paginateGoldRows(rows, { offset: 0, limit: 1, query: "beta" });
    expect(page.total).toBe(1);
    expect(page.rows[0]?.question).toContain("beta");
  });
});

describe("parseGoldRowsQueryParams", () => {
  it("validates query params", () => {
    const ok = parseGoldRowsQueryParams({
      env: "dev",
      file: "easy_single_hop.jsonl",
      offset: "0",
      limit: "25",
      q: "visa",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.limit).toBe(25);
      expect(ok.query).toBe("visa");
    }
  });
});
