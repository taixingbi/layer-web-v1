/**
 * Browser fetch wrapper that sends httpOnly session cookies on same-origin API routes.
 */

const DEFAULT_TIMEOUT_MS = 12_000;

/** Same-origin fetches that must send/receive httpOnly session cookies. */
export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "include",
  });
}

/** authFetch with AbortSignal timeout (avoids infinite "Checking access…"). */
export function authFetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const signal = init?.signal;
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return authFetch(input, { ...init, signal: controller.signal }).finally(() => {
    window.clearTimeout(timer);
  });
}
