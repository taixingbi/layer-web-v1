/**
 * Empty chat hero: headline + quick-start suggestion chips.
 */

"use client";

import { ChatBrand } from "@/components/ChatBrand";

const STARTER_PROMPTS = [
  "What is Taixing Bi's visa status?"
] as const;

type ChatEmptyStateProps = {
  onPick: (text: string) => void;
  disabled?: boolean;
  /** Unsigned visitor with guest chat enabled (no saved history). */
  guest?: boolean;
};

export function ChatEmptyState({ onPick, disabled, guest = false }: ChatEmptyStateProps) {
  return (
    <div className="chat-empty-state w-full max-w-2xl mx-auto text-center px-4 mb-8">
      <ChatBrand size="md" className="justify-center mb-6" />
      <h1 className="text-lg sm:text-xl font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">
        What can I help you with?
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
        {guest
          ? "Ask about public knowledge — no account required. Sign in to save conversations and access more."
          : "Ask about Taixing\u2019s resume, work experience, visa status, compensation\u2026"}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onPick(prompt)}
            className="chat-starter-chip text-sm rounded-full px-4 py-2 disabled:opacity-50 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
