import type { ChatMessage } from "@/lib/chat-types";
import { isLatencyObject } from "@/lib/chat-latency";

export type AssistantLayoutFlags = {
  hasAnswer: boolean;
  showThinking: boolean;
  showAnswer: boolean;
  showDetails: boolean;
  showFollowUps: boolean;
};

/** Visibility rules for rewrite, answer, follow-ups, and Details during SSE streaming. */
export function assistantMessageLayout(
  msg: Pick<
    ChatMessage,
    | "content"
    | "citations"
    | "latency_ms"
    | "trace_id"
    | "run_id"
    | "request_id"
    | "session_id"
    | "usage"
    | "route"
    | "route_detail"
    | "follow_up_questions"
    | "rag"
  >,
  isStreaming: boolean,
): AssistantLayoutFlags {
  const hasAnswer = Boolean(msg.content?.trim());
  const citeCount = msg.citations?.length ?? 0;
  const showLatency = !isStreaming && Boolean(msg.latency_ms && isLatencyObject(msg.latency_ms));
  const hasTrace = Boolean(
    msg.trace_id || msg.run_id || msg.request_id || msg.session_id || msg.usage,
  );
  const hasRoute = Boolean(msg.route || msg.route_detail);
  const hasRagMiss = Boolean(
    msg.rag &&
      typeof msg.rag === "object" &&
      msg.rag.not_found &&
      typeof msg.rag.not_found === "object",
  );
  const hasMeta = citeCount > 0 || showLatency || hasTrace || hasRoute || hasRagMiss;
  const hasFollowUps = Boolean(msg.follow_up_questions?.length);

  return {
    hasAnswer,
    showThinking: isStreaming && !hasAnswer,
    showAnswer: hasAnswer,
    showDetails: hasAnswer && hasMeta,
    showFollowUps: hasAnswer && hasFollowUps,
  };
}
