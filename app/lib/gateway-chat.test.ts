import { describe, expect, it } from "vitest";
import { donePayloadFromGatewayData, rewriteTextFromGatewayData } from "./gateway-chat";

describe("rewriteTextFromGatewayData", () => {
  it("reads rewrite from gateway rewrite or done payloads", () => {
    expect(rewriteTextFromGatewayData(JSON.stringify({ text: "Rewritten Q" }))).toBeNull();
    expect(
      rewriteTextFromGatewayData(JSON.stringify({ rewrite: "What is the candidate's visa status?" }))
    ).toBe("What is the candidate's visa status?");
  });
});

describe("donePayloadFromGatewayData", () => {
  it("extracts citations and follow_up_questions from gateway done JSON", () => {
    const raw = JSON.stringify({
      status: "success",
      citations: [{ cite_id: 1, source: "profile" }],
      follow_up_questions: ["Q1?", "Q2?"],
    });
    expect(donePayloadFromGatewayData(raw)).toEqual({
      rewrite: null,
      citations: [{ cite_id: 1, source: "profile" }],
      follow_up_questions: ["Q1?", "Q2?"],
    });
  });

  it("extracts rewrite when present on done", () => {
    const raw = JSON.stringify({
      status: "success",
      rewrite: "What is the candidate's visa status?",
      citations: [],
      follow_up_questions: [],
    });
    expect(donePayloadFromGatewayData(raw).rewrite).toBe("What is the candidate's visa status?");
  });

  it("filters non-string follow-up entries", () => {
    const raw = JSON.stringify({
      follow_up_questions: ["ok", 42, null, "also ok"],
    });
    expect(donePayloadFromGatewayData(raw).follow_up_questions).toEqual(["ok", "also ok"]);
  });
});
