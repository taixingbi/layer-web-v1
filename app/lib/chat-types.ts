/** In-memory chat turn (client id + optional persisted DB id). */
export type ChatCitation = Record<string, unknown>;

export type RouteDetail = {
  type?: string;
  name?: string;
  confidence?: number;
  reason?: string;
};

export type TokenUsageSlice = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  rewrite?: string;
  run_id?: string;
  request_id?: string;
  trace_id?: string;
  session_id?: string;
  conversation_id?: string;
  db_message_id?: string;
  model?: string;
  route?: string;
  route_detail?: RouteDetail;
  route_source?: string;
  usage?: Record<string, unknown>;
  citations?: ChatCitation[];
  follow_up_questions?: string[];
  latency_ms?: Record<string, unknown>;
};

export type ChatStreamStatus = "thinking" | "searching_sql" | "cached" | "error" | null;
