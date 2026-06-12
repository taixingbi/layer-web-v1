/** Map gateway / FastAPI error JSON to user-facing auth messages. */

type GatewayErrorBody = {
  detail?: unknown;
  error?: unknown;
  message?: unknown;
};

/** Extract a single string from gateway ``detail`` (string or validation array). */
export function messageFromGatewayBody(data: GatewayErrorBody): string | null {
  const detail = data.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return "";
      })
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error.trim();
  }
  return null;
}

/** User-facing copy for forgot-password failures. */
export function forgotPasswordErrorMessage(
  status: number,
  data: GatewayErrorBody,
): string {
  const raw = messageFromGatewayBody(data);
  const lower = (raw ?? "").toLowerCase();

  if (lower.includes("rate limit")) {
    return "Too many reset emails were sent. Please wait about an hour before trying again.";
  }
  if (raw) return raw;
  if (status >= 500 || status === 502) {
    return "Something went wrong. Please try again later.";
  }
  if (status === 400) {
    return "Enter a valid email address.";
  }
  return "Could not send reset email. Please try again later.";
}
