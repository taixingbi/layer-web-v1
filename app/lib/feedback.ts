/**
 * Build gateway ``POST /v1/feedback`` bodies from UI thumbs / annotation fields.
 */

const REASON_TO_FEEDBACK_REASON: Record<string, string> = {
  not_factually_correct: "not_factual",
  didnt_follow_instructions: "incomplete_instructions",
  offensive_unsafe: "unsafe",
  wrong_language: "not_relevant",
  other: "other",
};

export type FeedbackClientBody = {
  message_id: string;
  conversation_id: string;
  rating?: "thumbs_up" | "thumbs_down";
  reason?: string;
  comment?: string;
  question?: string;
  run_id?: string;
  request_id?: string;
  model?: string;
  route?: string;
  preference_score?: number;
  labeler_notes?: string;
  reviewer_type?: string;
};

/** Map UI payload to gateway ``FeedbackRequest`` JSON. */
export function buildGatewayFeedbackBody(body: FeedbackClientBody): Record<string, unknown> | null {
  const messageId = body.message_id?.trim();
  const conversationId = body.conversation_id?.trim();
  if (!messageId || !conversationId) return null;

  const out: Record<string, unknown> = {
    message_id: messageId,
    conversation_id: conversationId,
    reviewer_type: body.reviewer_type?.trim() || "end_user",
  };

  if (body.rating) {
    out.rating = body.rating;
  }
  if (body.run_id?.trim()) {
    out.trace_id = body.run_id.trim();
  }
  if (body.request_id?.trim()) {
    out.request_id = body.request_id.trim();
  }
  if (body.rating === "thumbs_down" && body.reason) {
    out.feedback_reason = REASON_TO_FEEDBACK_REASON[body.reason] ?? body.reason;
  }
  if (body.comment?.trim()) {
    out.comment = body.comment.trim();
  }
  if (body.question?.trim()) {
    out.question = body.question.trim();
  }
  if (body.model?.trim()) {
    out.model = body.model.trim();
  }
  if (body.route?.trim()) {
    out.route = body.route.trim();
  }
  if (typeof body.preference_score === "number") {
    out.preference_score = body.preference_score;
  }
  if (body.labeler_notes?.trim()) {
    out.labeler_notes = body.labeler_notes.trim();
  }
  return out;
}
