import type { ChatMessage } from "@/lib/chat-types";

/** Apply a partial update to the in-flight streaming assistant message. */
export function patchStreamingMessage(
  messages: ChatMessage[],
  streamingId: string | null,
  patch: Partial<ChatMessage>,
): ChatMessage[] {
  if (!streamingId) return messages;
  return messages.map((m) => (m.id === streamingId ? { ...m, ...patch } : m));
}
