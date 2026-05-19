/**
 * Unit tests for log payload shaping ({@link webMeta}, {@link payloadForLog}, chat/feedback helpers).
 */

import { describe, expect, it } from "vitest";
import {
  chatClientRequestForLog,
  chatClientResponseForLog,
  payloadForLog,
  webMeta,
} from "./web-log-payload";

describe("web-log-payload", () => {
  it("webMeta nests payloads under web_meta", () => {
    const out = webMeta({
      web_api_request: { message: "hi" },
      gateway_api_request: { message: "hi", stream: true },
    });
    expect(out.web_meta).toEqual({
      web_api_request: { message: "hi" },
      gateway_api_request: { message: "hi", stream: true },
    });
  });

  it("payloadForLog truncates large JSON", () => {
    const big = { x: "y".repeat(9000) };
    const logged = payloadForLog(big) as { _truncated?: boolean; preview?: string };
    expect(logged._truncated).toBe(true);
    expect(logged.preview?.length).toBe(8000);
  });

  it("chatClientRequestForLog includes history turns", () => {
    expect(
      chatClientRequestForLog({
        message: "q",
        history: [{ role: "user", content: "a" }],
      })
    ).toMatchObject({
      message: "q",
      history_turns: 1,
      history: [{ role: "user", content: "a" }],
    });
  });

  it("chatClientResponseForLog summarizes stream response", () => {
    expect(
      chatClientResponseForLog({
        stream: true,
        response: "Hello",
        rewrite: "Rewritten",
        citations: [{ cite_id: 1 }],
        follow_up_questions: ["Next?"],
      })
    ).toMatchObject({
      stream: true,
      response_chars: 5,
      response: "Hello",
      rewrite: "Rewritten",
      citations_count: 1,
      follow_up_questions_count: 1,
    });
  });
});
