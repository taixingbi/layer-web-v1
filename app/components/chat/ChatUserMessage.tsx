"use client";

import { memo } from "react";
import type { ChatMessage } from "@/lib/chat-types";

type Props = {
  msg: ChatMessage;
  loading: boolean;
  isEditing: boolean;
  editDraft: string;
  editOriginal: string;
  onEditDraftChange: (value: string) => void;
  onCancelEdit: () => void;
  onSubmitEdit: () => void;
  onStartEdit: () => void;
};

function ChatUserMessageInner({
  msg,
  loading,
  isEditing,
  editDraft,
  editOriginal,
  onEditDraftChange,
  onCancelEdit,
  onSubmitEdit,
  onStartEdit,
}: Props) {
  return (
    <div className="flex w-full justify-end group">
      <div className="flex flex-col items-end max-w-[min(85%,32rem)] w-full">
        {isEditing ? (
          <div className="chat-user-edit-wrap w-full">
            <textarea
              value={editDraft}
              onChange={(e) => onEditDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  onCancelEdit();
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  onSubmitEdit();
                }
              }}
              rows={Math.min(12, Math.max(2, editDraft.split("\n").length))}
              className="chat-user-edit-textarea"
              autoFocus
              aria-label="Edit message"
            />
            <div className="chat-user-edit-actions">
              <button type="button" onClick={onCancelEdit} className="chat-user-edit-cancel">
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmitEdit}
                disabled={!editDraft.trim() || editDraft.trim() === editOriginal.trim()}
                className="chat-user-edit-send"
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="chat-user-bubble rounded-3xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {msg.content}
            </div>
            {!loading && msg.content.trim() ? (
              <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="chat-action-btn p-1.5 rounded-lg transition-colors"
                  aria-label="Edit message"
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
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export const ChatUserMessage = memo(ChatUserMessageInner);
