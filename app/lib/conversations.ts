/**
 * Types and helpers for gateway conversation history (list + load).
 */

/** One thread in ``GET /api/conversations``. */
export type ConversationSummary = {
  id: string;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** One persisted turn from ``GET /api/conversations/{id}/messages``. */
export type StoredMessage = {
  id?: string | null;
  role: "user" | "assistant" | string;
  content: string;
  status?: string | null;
  metadata?: {
    rewrite?: string;
    citations?: Array<Record<string, unknown>>;
    follow_up_questions?: string[];
    model?: string;
  } | null;
  created_at?: string | null;
};

export type ConversationListResponse = {
  conversations: ConversationSummary[];
};

export type ConversationMessagesResponse = {
  conversation_id: string;
  messages: StoredMessage[];
};

/** sessionStorage key for the active thread (UUID from gateway). */
export const ACTIVE_CONVERSATION_KEY = "layer_active_conversation_id";

/** Read active conversation id from session storage. */
export function getActiveConversationId(): string | null {
  try {
    const id = sessionStorage.getItem(ACTIVE_CONVERSATION_KEY)?.trim();
    return id || null;
  } catch {
    return null;
  }
}

/** Persist or clear active conversation id. */
export function setActiveConversationId(id: string | null): void {
  try {
    if (id?.trim()) {
      sessionStorage.setItem(ACTIVE_CONVERSATION_KEY, id.trim());
    } else {
      sessionStorage.removeItem(ACTIVE_CONVERSATION_KEY);
    }
  } catch {
    /* storage blocked */
  }
}

/** Relative time for sidebar (e.g. ``2h ago``, ``Yesterday``). */
export function formatConversationTime(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Sidebar label: title, else first-line preview, else fallback. */
export function conversationLabel(
  conv: ConversationSummary,
  fallback = "New chat",
): string {
  const title = conv.title?.trim();
  if (title) return title.length > 48 ? `${title.slice(0, 48)}…` : title;
  return fallback;
}

/** UUID from a client id like ``db-<uuid>``. */
export function dbMessageIdFromClientId(clientId: string): string | null {
  if (clientId.startsWith("db-")) {
    const raw = clientId.slice(3).trim();
    return raw || null;
  }
  return null;
}

/** Map API messages to in-memory chat turns (client ids for React keys). */
export function storedMessagesToChatTurns(
  messages: StoredMessage[],
): Array<{
  id: string;
  role: "user" | "assistant";
  content: string;
  db_message_id?: string;
  model?: string;
}> {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim())
    .map((m, i) => {
      const dbId =
        typeof m.id === "string" && m.id.trim()
          ? m.id.trim()
          : typeof m.id === "number"
            ? String(m.id)
            : null;
      return {
        id: dbId ? `db-${dbId}` : `hist-${i}-${m.role}`,
        role: m.role as "user" | "assistant",
        content: m.content.trim(),
        ...(dbId ? { db_message_id: dbId } : {}),
        ...(m.metadata?.model ? { model: m.metadata.model } : {}),
      };
    });
}
