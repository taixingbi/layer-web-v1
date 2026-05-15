import { describe, expect, it } from "vitest";
import { gatewayResponseLogFields } from "./gateway-upstream-log";

describe("gatewayResponseLogFields", () => {
  it("maps status, content-type, correlation headers, and content-length", () => {
    const res = new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Request-Id": "req_abc",
        "X-Trace-Id": "trace_xyz",
        "Content-Length": "0",
      },
    });
    expect(gatewayResponseLogFields(res)).toEqual({
      gateway_status: 200,
      gateway_content_type: "text/event-stream; charset=utf-8",
      gateway_request_id: "req_abc",
      gateway_trace_id: "trace_xyz",
      gateway_content_length: "0",
    });
  });

  it("truncates very long content-type", () => {
    const long = `a${"b".repeat(250)}`;
    const res = new Response(null, {
      status: 502,
      headers: { "Content-Type": long },
    });
    const f = gatewayResponseLogFields(res);
    expect(f.gateway_status).toBe(502);
    expect(String(f.gateway_content_type).length).toBeLessThanOrEqual(203);
    expect(String(f.gateway_content_type).endsWith("...")).toBe(true);
  });
});
