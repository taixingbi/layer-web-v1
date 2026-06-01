"use client";

import { memo, useId } from "react";
import { AssistantMessageContent } from "@/components/chat/AssistantMessageContent";
import { AssistantMessageMeta } from "@/components/chat/AssistantMessageMeta";
import { ChatLoadingDots } from "@/components/chat/ChatLoadingDots";
import { StreamingCursor } from "@/components/chat/StreamingCursor";
import type { ChatMessage } from "@/lib/chat-types";

type Props = {
  msg: ChatMessage;
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
  const followUpSelectId = useId();
  const showThinking = isStreaming && !msg.content.trim() && !msg.rewrite;
  const showAnswer = !isStreaming || Boolean(msg.content.trim());
  const citeCount = msg.citations?.length ?? 0;
  const hasFollowUps = Boolean(msg.follow_up_questions?.length);
  const showLatency = !isStreaming && Boolean(msg.latency_ms);

  return (
    <div className="flex w-full justify-start">
      <div className="chat-assistant-block w-full text-[15px] leading-relaxed">
        <div className="chat-assistant-sections">
          <div className="whitespace-pre-wrap break-words chat-assistant-answer">
            {msg.rewrite ? (
              <p className="chat-rewrite-meta">
                <span className="chat-rewrite-meta-label">Rewrite: </span>
                <span className="chat-rewrite-meta-query">&ldquo;{msg.rewrite}&rdquo;</span>
                {isStreaming && !msg.content.trim() ? <StreamingCursor /> : null}
              </p>
            ) : null}
            {showThinking ? <ChatLoadingDots label={statusLabel} /> : null}
            {showAnswer ? (
              <p className="chat-assistant-answer-text">
                <AssistantMessageContent content={msg.content} />
                {isStreaming ? <StreamingCursor /> : null}
              </p>
            ) : null}
          </div>

          {citeCount > 0 || showLatency ? (
            <AssistantMessageMeta
              citations={citeCount > 0 ? msg.citations : undefined}
              latency_ms={showLatency ? msg.latency_ms : undefined}
            />
          ) : null}

          {hasFollowUps ? (
            <div className="chat-follow-up-section">
              <label htmlFor={followUpSelectId} className="chat-follow-up-label">
                Follow-up
              </label>
              <select
                id={followUpSelectId}
                className="chat-follow-up-select"
                disabled={loading}
                defaultValue=""
                onChange={(e) => {
                  const q = e.target.value;
                  if (!q) return;
                  onFollowUp(q);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  Choose a follow-up question…
                </option>
                {msg.follow_up_questions!.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

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
