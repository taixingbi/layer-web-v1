/**
 * Unit tests for gateway SSE payload parsers in {@link gateway-chat}.
 */

import { describe, expect, it } from "vitest";
import {
  donePayloadFromGatewayData,
  metaFromGatewayData,
  rewriteTextFromGatewayData,
} from "./gateway-chat";

describe("rewriteTextFromGatewayData", () => {
  it("reads rewrite from gateway rewrite event or done payloads", () => {
    expect(rewriteTextFromGatewayData(JSON.stringify({ text: "Taixing Bi's US visa status" }))).toBe(
      "Taixing Bi's US visa status"
    );
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
      assistant_message_id: null,
      model: null,
      route: null,
      route_detail: null,
      route_source: null,
      usage: null,
      latency_ms: null,
      rag: null,
    });
  });

  it("extracts rag from gateway done JSON", () => {
    const rag = {
      collection: "taixing_knowledge",
      retrieval: { retrieved_chunks: 40, reranked_chunks: 10, context_chunks: 5 },
    };
    const raw = JSON.stringify({
      status: "success",
      rag,
      citations: [],
      follow_up_questions: [],
    });
    expect(donePayloadFromGatewayData(raw).rag).toEqual(rag);
  });

  it("extracts assistant_message_id when present on done", () => {
    const raw = JSON.stringify({
      status: "success",
      assistant_message_id: "37118ca8-8289-480c-9083-23d6d6e564c2",
      citations: [],
      follow_up_questions: [],
    });
    expect(donePayloadFromGatewayData(raw).assistant_message_id).toBe(
      "37118ca8-8289-480c-9083-23d6d6e564c2",
    );
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

  it("extracts latency_ms from gateway done JSON", () => {
    const latency = { total: 100, auth: 5, orchestrator: { proxy_total: 90, workflow: {} } };
    const raw = JSON.stringify({
      status: "success",
      latency_ms: latency,
      citations: [],
      follow_up_questions: [],
    });
    expect(donePayloadFromGatewayData(raw).latency_ms).toEqual(latency);
  });
});

describe("metaFromGatewayData", () => {
  it("includes conversation_id and assistant_message_id from gateway meta event", () => {
    const raw = JSON.stringify({
      request_id: "req_1",
      trace_id: "trace_1",
      session_id: "sess_1",
      conversation_id: "550e8400-e29b-41d4-a716-446655440000",
      assistant_message_id: "37118ca8-8289-480c-9083-23d6d6e564c2",
    });
    expect(metaFromGatewayData(raw).conversation_id).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(metaFromGatewayData(raw).assistant_message_id).toBe(
      "37118ca8-8289-480c-9083-23d6d6e564c2",
    );
  });

  it("includes model and route from gateway meta event", () => {
    const raw = JSON.stringify({ model: "qwen2.5-7b", route: "rag" });
    expect(metaFromGatewayData(raw).model).toBe("qwen2.5-7b");
    expect(metaFromGatewayData(raw).route).toBe("rag");
  });
});
