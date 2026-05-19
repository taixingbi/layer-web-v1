/**
 * Empty chat hero: headline + quick-start suggestion chips.
 */

"use client";

import { ChatBrand } from "@/components/ChatBrand";

export const STARTER_PROMPTS = [
  "Explain JWT auth",
  "Review my architecture",
  "Summarize logs",
  "Debug Kubernetes issue",
] as const;

type ChatEmptyStateProps = {
  onPick: (text: string) => void;
  disabled?: boolean;
};

export function ChatEmptyState({ onPick, disabled }: ChatEmptyStateProps) {
  return (
    <div className="chat-empty-state w-full max-w-2xl mx-auto text-center px-4 mb-8">
      <ChatBrand size="md" className="justify-center mb-6" />
      <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-2 tracking-tight">
        How can I help you today?
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
        Ask about jobs, architecture, logs, or anything your gateway and orchestrator stack can reach.
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
