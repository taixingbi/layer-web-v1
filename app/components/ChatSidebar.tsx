/**
 * ChatGPT-style sidebar: new chat + conversation history list.
 */

"use client";

import type { ConversationSummary } from "@/lib/conversations";
import { conversationLabel, formatConversationTime } from "@/lib/conversations";

type ChatSidebarProps = {
  conversations: ConversationSummary[];
  activeId: string | null;
  loadingList: boolean;
  loadingThread: boolean;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  className?: string;
};

export function ChatSidebar({
  conversations,
  activeId,
  loadingList,
  loadingThread,
  onNewChat,
  onSelect,
  className = "",
}: ChatSidebarProps) {
  return (
    <aside
      className={`chat-sidebar flex flex-col h-full shrink-0 w-[272px] ${className}`}
      aria-label="Chat history"
    >
      <div className="p-3 shrink-0 border-b border-gray-200/80 dark:border-gray-800">
        <button
          type="button"
          onClick={onNewChat}
          disabled={loadingThread}
          className="chat-sidebar-new w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New chat
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 min-h-0">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Recent
        </p>
        {loadingList ? (
          <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Loading chats…</p>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">No chats yet</p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => {
              const active = conv.id === activeId;
              const time = formatConversationTime(conv.updated_at ?? conv.created_at);
              return (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conv.id)}
                    disabled={loadingThread && !active}
                    title={conversationLabel(conv, "Chat")}
                    className={`chat-sidebar-item w-full text-left rounded-xl px-3 py-2.5 transition-colors disabled:opacity-50 ${
                      active ? "chat-sidebar-item--active" : ""
                    }`}
                  >
                    <span className="block text-sm font-medium truncate text-gray-800 dark:text-gray-100">
                      {conversationLabel(conv, "Chat")}
                    </span>
                    {time ? (
                      <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {time}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
