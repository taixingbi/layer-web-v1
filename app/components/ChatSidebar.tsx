/**
 * ChatGPT-style sidebar: new chat + conversation history list.
 */

"use client";

import type { ConversationSummary } from "@/lib/conversations";
import { conversationLabel } from "@/lib/conversations";

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
      className={`chat-sidebar flex flex-col h-full shrink-0 w-[260px] border-r border-gray-200 dark:border-gray-800 bg-[#f7f7f8] dark:bg-[#171717] ${className}`}
      aria-label="Chat history"
    >
      <div className="p-2 shrink-0">
        <button
          type="button"
          onClick={onNewChat}
          disabled={loadingThread}
          className="chat-sidebar-new w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New chat
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-3 min-h-0">
        {loadingList ? (
          <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Loading chats…</p>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">No chats yet</p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conv) => {
              const active = conv.id === activeId;
              return (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conv.id)}
                    disabled={loadingThread && !active}
                    title={conversationLabel(conv, "Chat")}
                    className={`chat-sidebar-item w-full text-left rounded-lg px-3 py-2 text-sm truncate transition-colors ${
                      active
                        ? "bg-white dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] shadow-sm"
                        : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"
                    } disabled:opacity-50`}
                  >
                    {conversationLabel(conv, "Chat")}
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
