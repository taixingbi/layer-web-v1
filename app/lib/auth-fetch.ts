/**
 * Browser fetch wrapper that sends httpOnly session cookies on same-origin API routes.
 */

/** Same-origin fetches that must send/receive httpOnly session cookies. */
export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "include",
  });
}
