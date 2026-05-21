/** Client-side helpers for chat fetch (session ids, correlation, dev bearer). */

/** UUID for correlation; fallback when ``crypto.randomUUID`` is unavailable. */
export function correlationUuid(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") {
    try {
      return c.randomUUID();
    } catch {
      /* continue */
    }
  }
  if (c && typeof c.getRandomValues === "function") {
    try {
      const b = new Uint8Array(16);
      c.getRandomValues(b);
      b[6] = (b[6]! & 0x0f) | 0x40;
      b[8] = (b[8]! & 0x3f) | 0x80;
      const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    } catch {
      /* fall through */
    }
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}${Math.random().toString(36).slice(2, 7)}`;
}

/** React list key for a new in-flight message. */
export function nextChatMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Optional access token for gateway JWT mode (dev: ``layer_bearer_token`` in sessionStorage). */
export function optionalLayerBearerHeaders(): Record<string, string> {
  try {
    const t = sessionStorage.getItem("layer_bearer_token")?.trim();
    if (t) return { Authorization: `Bearer ${t}` };
  } catch {
    /* storage blocked */
  }
  return {};
}
