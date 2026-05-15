import { describe, expect, it } from "vitest";
import { donePayloadFromGatewayData } from "./gateway-chat";

describe("donePayloadFromGatewayData", () => {
  it("extracts citations and follow_up_questions from gateway done JSON", () => {
    const raw = JSON.stringify({
      status: "success",
      citations: [{ cite_id: 1, source: "profile" }],
      follow_up_questions: ["Q1?", "Q2?"],
    });
    expect(donePayloadFromGatewayData(raw)).toEqual({
      citations: [{ cite_id: 1, source: "profile" }],
      follow_up_questions: ["Q1?", "Q2?"],
    });
  });

  it("filters non-string follow-up entries", () => {
    const raw = JSON.stringify({
      follow_up_questions: ["ok", 42, null, "also ok"],
    });
    expect(donePayloadFromGatewayData(raw).follow_up_questions).toEqual(["ok", "also ok"]);
  });
});
