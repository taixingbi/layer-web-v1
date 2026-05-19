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
  id?: number | null;
  role: "user" | "assistant" | string;
  content: string;
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

/** Sidebar label: title, else first-line preview, else fallback. */
export function conversationLabel(
  conv: ConversationSummary,
  fallback = "New chat",
): string {
  const title = conv.title?.trim();
  if (title) return title.length > 48 ? `${title.slice(0, 48)}…` : title;
  return fallback;
}

/** Map API messages to in-memory chat turns (client ids for React keys). */
export function storedMessagesToChatTurns(
  messages: StoredMessage[],
): Array<{ id: string; role: "user" | "assistant"; content: string }> {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim())
    .map((m, i) => ({
      id: m.id != null ? `db-${m.id}` : `hist-${i}-${m.role}`,
      role: m.role as "user" | "assistant",
      content: m.content.trim(),
    }));
}
