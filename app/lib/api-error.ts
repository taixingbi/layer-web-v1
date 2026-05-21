/** Extract a user-facing message from a JSON error body. */
export function errorMessageFromJsonBody(
  body: {
    error?: { message?: string };
    detail?: string | unknown;
    message?: string;
  },
  fallback: string,
): string {
  if (body.error && typeof body.error.message === "string") return body.error.message;
  if (typeof body.detail === "string") return body.detail;
  if (typeof body.message === "string") return body.message;
  return fallback;
}
