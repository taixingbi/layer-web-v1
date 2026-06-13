/**
 * Empty chat hero: recruiter headline + quick-start topic cards.
 */

"use client";

import { ChatBrand } from "@/components/ChatBrand";
import { RECRUITER_STARTER_CARDS } from "@/lib/chat-starter-cards";

type ChatEmptyStateProps = {
  onPick: (text: string) => void;
  disabled?: boolean;
  /** Unsigned visitor with guest chat enabled (no saved history). */
  guest?: boolean;
};

export function ChatEmptyState({ onPick, disabled, guest = false }: ChatEmptyStateProps) {
  return (
    <div className="chat-empty-state w-full max-w-3xl mx-auto text-center px-4 mb-8">
      <ChatBrand size="md" className="justify-center mb-6" />
      <h1 className="text-xl sm:text-2xl font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-3">
        Ask me about Taixing Bi
      </h1>
      <p className="text-sm sm:text-[0.9375rem] text-gray-600 dark:text-gray-400 mb-2 max-w-lg mx-auto leading-relaxed">
        Recruiters can explore experience, projects, work authorization, and AI infrastructure
        expertise.
      </p>
      {guest ? (
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-6 max-w-md mx-auto">
          No account required. Sign in to save conversations.
        </p>
      ) : (
        <div className="mb-6" aria-hidden />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-2xl mx-auto">
        {RECRUITER_STARTER_CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(card.prompt)}
            className="chat-starter-card disabled:opacity-50 transition-colors"
          >
            <span className="chat-starter-card-title">{card.title}</span>
            <span className="chat-starter-card-prompt">{card.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
