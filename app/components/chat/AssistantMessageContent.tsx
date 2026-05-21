"use client";

import { normalizeCitationSpacing } from "@/lib/citation-content";

/** Inline citation markers from the model, e.g. ``[1]``, ``[2]``. */
const CITE_MARKER_RE = /(\[\d+\])/g;

type Props = {
  content: string;
};

export function AssistantMessageContent({ content }: Props) {
  const normalized = normalizeCitationSpacing(content);
  const parts = normalized.split(CITE_MARKER_RE);
  return (
    <>
      {parts.map((part, i) =>
        /^\[\d+\]$/.test(part) ? (
          <sup key={i} className="chat-cite-marker">
            {part}
          </sup>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
