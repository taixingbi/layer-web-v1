"use client";

import { memo } from "react";
import { ChatLatencyDetails } from "@/components/ChatLatencyDetails";
import { CitationList } from "@/components/chat/CitationList";
import { ChatLoadingDots } from "@/components/chat/ChatLoadingDots";
import { StreamingCursor } from "@/components/chat/StreamingCursor";
import { isLatencyObject } from "@/lib/chat-latency";
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
  const showThinking = isStreaming && !msg.content.trim() && !msg.rewrite;
  const showAnswer = !isStreaming || Boolean(msg.content.trim());

  return (
    <div className="flex w-full justify-start">
      <div className="chat-assistant-block w-full text-[15px] leading-relaxed">
        <div className="whitespace-pre-wrap break-words">
          {msg.rewrite ? (
            <p className="chat-rewrite-meta">
              <span className="chat-rewrite-meta-label">Rewrite: </span>
              <span className="chat-rewrite-meta-query">&ldquo;{msg.rewrite}&rdquo;</span>
              {isStreaming && !msg.content.trim() ? <StreamingCursor /> : null}
            </p>
          ) : null}
          {showThinking ? <ChatLoadingDots label={statusLabel} /> : null}
          {showAnswer ? (
            <p>
              {msg.content}
              {isStreaming ? <StreamingCursor /> : null}
            </p>
          ) : null}
        </div>
        {msg.citations && msg.citations.length > 0 ? (
          <CitationList citations={msg.citations} />
        ) : null}
        {msg.follow_up_questions && msg.follow_up_questions.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Follow-up questions</p>
            <div className="flex flex-wrap gap-2">
              {msg.follow_up_questions.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={loading}
                  onClick={() => onFollowUp(q)}
                  className="chat-follow-up-chip text-left text-sm rounded-xl px-3 py-1.5 disabled:opacity-50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {!isStreaming && msg.latency_ms && isLatencyObject(msg.latency_ms) ? (
          <ChatLatencyDetails latency_ms={msg.latency_ms} />
        ) : null}
        {!isStreaming && msg.content.trim() ? (
          <div className="flex items-center gap-0.5 mt-3 -ml-1">
            <button
              type="button"
              disabled={!feedbackReady}
              onClick={onThumbsUp}
              className={`chat-action-btn p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                thumbsUp ? "text-[#10a37f]" : ""
              }`}
              aria-label="Good response"
              title={
                feedbackReady
                  ? "Good response"
                  : "Feedback is available after this reply is saved"
              }
            >
              <svg
                width="18"
                height="18"
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
              className={`chat-action-btn p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                thumbsDown ? "text-gray-600" : ""
              }`}
              aria-label="Bad response"
              title={
                feedbackReady
                  ? "Bad response"
                  : "Feedback is available after this reply is saved"
              }
            >
              <svg
                width="18"
                height="18"
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
              className="chat-action-btn p-2 rounded-lg transition-colors"
              aria-label="Copy"
            >
              <svg
                width="18"
                height="18"
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
                className="chat-action-btn p-2 rounded-lg transition-colors"
                aria-label="Regenerate"
              >
                <svg
                  width="18"
                  height="18"
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
  );
}

export const ChatAssistantMessage = memo(ChatAssistantMessageInner);
