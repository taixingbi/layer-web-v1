/**
 * Build and truncate conversation history sent to ``POST /api/chat``.
 */

/** Single turn in gateway chat history (role + content only). */
export type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

/** In-memory message shape before mapping to {@link HistoryMessage}. */
export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

/** Build API history from prior turns (content only; omits rewrite/metadata). */
export function buildHistory(msgs: ChatTurn[]): HistoryMessage[] {
  return msgs
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.content }));
}

/** Remove message at id and everything after it (for edit/regenerate branch). */
export function truncateBeforeMessageId<T extends { id: string }>(msgs: T[], messageId: string): T[] {
  const index = msgs.findIndex((m) => m.id === messageId);
  if (index < 0) return msgs;
  return msgs.slice(0, index);
}
