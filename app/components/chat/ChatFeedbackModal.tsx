"use client";

const FEEDBACK_REASONS = [
  { id: "not_factually_correct", label: "Not factually correct" },
  { id: "didnt_follow_instructions", label: "Didn't follow instructions" },
  { id: "offensive_unsafe", label: "Offensive / Unsafe" },
  { id: "wrong_language", label: "Wrong language" },
  { id: "other", label: "Other" },
] as const;

type Props = {
  comment: string;
  onCommentChange: (value: string) => void;
  onClose: () => void;
  onReason: (reason: string) => void;
};

export function ChatFeedbackModal({ comment, onCommentChange, onClose, onReason }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              What went wrong?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your feedback helps make things better for everyone.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          {FEEDBACK_REASONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onReason(id)}
              className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {label}
            </button>
          ))}
          <label className="block">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Additional details (optional)
            </span>
            <textarea
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="e.g. Only returned 3 titles"
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 text-sm resize-none"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
