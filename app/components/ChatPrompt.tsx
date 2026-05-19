/**
 * Primary chat input: hero-centered when empty, sticky footer when in a thread.
 */

"use client";

import { useCallback, useRef } from "react";

type ChatPromptProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  onStop?: () => void;
  mode: "hero" | "sticky";
  placeholder?: string;
};

export function ChatPrompt({
  value,
  onChange,
  onSubmit,
  loading,
  onStop,
  mode,
  placeholder = "Ask anything…",
}: ChatPromptProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!loading && value.trim()) onSubmit();
      }
    },
    [loading, onSubmit, value],
  );

  const shellClass =
    mode === "hero"
      ? "chat-prompt-shell chat-prompt-shell--hero w-full max-w-[52rem] mx-auto"
      : "chat-prompt-shell chat-prompt-shell--sticky w-full max-w-[52rem] mx-auto";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading && value.trim()) onSubmit();
      }}
      className={mode === "sticky" ? "chat-prompt-form--sticky shrink-0" : "w-full"}
    >
      <div className={shellClass}>
        <div className="chat-prompt-box flex items-end gap-2 px-4 py-3 sm:px-5 sm:py-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={loading && !onStop}
            rows={1}
            className="chat-prompt-input flex-1 resize-none bg-transparent text-[15px] sm:text-base leading-relaxed outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 min-h-[1.5rem] max-h-40 py-0.5"
            aria-label="Message"
          />
          {loading && onStop ? (
            <button
              type="button"
              onClick={onStop}
              className="chat-prompt-stop shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
              aria-label="Stop generating"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="chat-prompt-send shrink-0 p-2.5 rounded-xl disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
          )}
        </div>
        {mode === "hero" ? (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
            Press Enter to send · Shift+Enter for new line
          </p>
        ) : null}
      </div>
    </form>
  );
}
