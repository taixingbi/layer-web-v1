/** In-memory chat turn (client id + optional persisted DB id). */
export type ChatCitation = Record<string, unknown>;

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  rewrite?: string;
  run_id?: string;
  request_id?: string;
  db_message_id?: string;
  model?: string;
  route?: string;
  citations?: ChatCitation[];
  follow_up_questions?: string[];
  latency_ms?: Record<string, unknown>;
};

export type ChatStreamStatus = "thinking" | "searching_sql" | "cached" | "error" | null;
