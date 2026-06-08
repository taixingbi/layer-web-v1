"use client";

import { memo } from "react";
import { AssistantMessageContent } from "@/components/chat/AssistantMessageContent";
import { AssistantMessageMeta } from "@/components/chat/AssistantMessageMeta";
import { ChatLoadingDots } from "@/components/chat/ChatLoadingDots";
import { StreamingCursor } from "@/components/chat/StreamingCursor";
import { assistantMessageLayout } from "@/lib/chat-assistant-layout";
import type { ChatMessage } from "@/lib/chat-types";
import { suggestedQuestionsChatLabel } from "@/lib/timeline-phase-labels";

type Props = {
  msg: ChatMessage;
  conversationId?: string | null;
  isStreaming: boolean;
  statusLabel: string;
  loading: boolean;
  thumbsUp: boolean;
  thumbsDown: boolean;
  feedbackReady: boolean;
  isLastAssistant: boolean;
  onFollowUp: (q: string) => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
};

function ChatAssistantMessageInner({
  msg,
  conversationId,
  isStreaming,
  statusLabel,
  loading,
  thumbsUp,
  thumbsDown,
  feedbackReady,
  isLastAssistant,
  onFollowUp,
  onThumbsUp,
  onThumbsDown,
  onCopy,
  onRegenerate,
}: Props) {
  const { showThinking, showAnswer, showDetails, showFollowUps } = assistantMessageLayout(
    msg,
    isStreaming,
  );
  const rewriteText = msg.rewrite?.trim() ?? "";

  const debugMsg: ChatMessage = {
    ...msg,
    conversation_id: msg.conversation_id ?? conversationId ?? undefined,
  };

  return (
    <div className="flex w-full justify-start">
      <div className="chat-assistant-block w-full text-[15px] leading-relaxed">
        <div className="chat-assistant-sections">
          <div className="break-words chat-assistant-answer">
            {rewriteText ? (
              <p className="chat-rewrite-meta">
                <span className="chat-rewrite-meta-label">Rewrite: </span>
                <span className="chat-rewrite-meta-query">&ldquo;{rewriteText}&rdquo;</span>
              </p>
            ) : null}
            {showThinking ? <ChatLoadingDots label={statusLabel} /> : null}
            {showAnswer ? (
              <div className="chat-assistant-answer-text chat-assistant-answer-in">
                <AssistantMessageContent content={msg.content} />
                {isStreaming ? <StreamingCursor /> : null}
              </div>
            ) : null}
            {showFollowUps ? (
              <div className="chat-follow-up-meta">
                {msg.follow_up_questions!.length === 1 ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onFollowUp(msg.follow_up_questions![0])}
                    className="chat-follow-up-meta-item chat-follow-up-meta-item--inline"
                  >
                    <span className="chat-rewrite-meta-label">
                      {suggestedQuestionsChatLabel(1)}{" "}
                    </span>
                    <span className="chat-rewrite-meta-query">
                      &ldquo;{msg.follow_up_questions![0]}&rdquo;
                    </span>
                  </button>
                ) : (
                  <>
                    <p className="chat-rewrite-meta chat-follow-up-meta-label">
                      <span className="chat-rewrite-meta-label">
                        {suggestedQuestionsChatLabel(msg.follow_up_questions!.length)}
                      </span>
                    </p>
                    {msg.follow_up_questions!.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={loading}
                        onClick={() => onFollowUp(q)}
                        className="chat-follow-up-meta-item"
                      >
                        <span className="chat-rewrite-meta-query">&ldquo;{q}&rdquo;</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            ) : null}
          </div>

          {showDetails ? <AssistantMessageMeta msg={debugMsg} /> : null}

          {!isStreaming && msg.content.trim() ? (
            <div className="chat-message-actions">
              <button
                type="button"
                disabled={!feedbackReady}
                onClick={onThumbsUp}
                className={`chat-action-btn ${thumbsUp ? "is-active-up" : ""}`}
                aria-label="Good response"
                title={
                  feedbackReady
                    ? "Good response"
                    : "Feedback is available after this reply is saved"
                }
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={thumbsUp ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </button>
              <button
                type="button"
                disabled={!feedbackReady}
                onClick={onThumbsDown}
                className={`chat-action-btn ${thumbsDown ? "is-active-down" : ""}`}
                aria-label="Bad response"
                title={
                  feedbackReady
                    ? "Bad response"
                    : "Feedback is available after this reply is saved"
                }
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={thumbsDown ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onCopy}
                className="chat-action-btn"
                aria-label="Copy"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
              {isLastAssistant ? (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="chat-action-btn"
                  aria-label="Regenerate"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M1 4v6h6" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const ChatAssistantMessage = memo(ChatAssistantMessageInner);
