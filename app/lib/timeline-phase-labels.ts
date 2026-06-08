/** Execution timeline row labels (match hover panel section titles). */

export const PHASE_QUERY_EMBEDDING = "Query embedding";
export const PHASE_RAG_ANSWER_GENERATION = "RAG answer generation";
export const PHASE_ANSWER_GENERATION = "Answer generation";

export function chatPhaseLabel(nodeId: string): string {
  return nodeId.includes("github") ? PHASE_ANSWER_GENERATION : PHASE_RAG_ANSWER_GENERATION;
}

export function isEmbedTimelineLabel(label: string): boolean {
  return label === PHASE_QUERY_EMBEDDING;
}

export function isChatTimelineLabel(label: string): boolean {
  return (
    label === PHASE_RAG_ANSWER_GENERATION ||
    label === PHASE_ANSWER_GENERATION ||
    label === "Chat"
  );
}
