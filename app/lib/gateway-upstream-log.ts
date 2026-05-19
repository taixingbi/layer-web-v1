/**
 * Extract gateway HTTP response fields for structured BFF logs.
 */

/** Fields to merge into BFF JSON logs when the gateway HTTP response is available. */
export function gatewayResponseLogFields(res: Response): Record<string, unknown> {
  const h = res.headers;
  const ct = (h.get("content-type") || "").trim();
  const rid = (h.get("x-request-id") || "").trim();
  const tid = (h.get("x-trace-id") || "").trim();
  const cl = (h.get("content-length") || "").trim();
  const out: Record<string, unknown> = {
    gateway_status: res.status,
  };
  if (ct) out.gateway_content_type = ct.length > 200 ? `${ct.slice(0, 200)}...` : ct;
  if (rid) out.gateway_request_id = rid;
  if (tid) out.gateway_trace_id = tid;
  if (cl) out.gateway_content_length = cl;
  return out;
}
