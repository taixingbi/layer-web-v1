import { CitationSourceList } from "@/components/chat/CitationSourceList";
import type { ChatCitation } from "@/lib/chat-types";

type Props = {
  citations: ChatCitation[];
};

/** Standalone sources expand (prefer {@link AssistantMessageMeta} in chat). */
export function CitationList({ citations }: Props) {
  if (citations.length === 0) return null;
  return (
    <details className="chat-assistant-meta group">
      <summary className="chat-assistant-meta-summary">
        <span className="chat-assistant-meta-chevron" aria-hidden>
          ▶
        </span>
        {citations.length} source{citations.length === 1 ? "" : "s"}
      </summary>
      <div className="chat-assistant-meta-body">
        <CitationSourceList citations={citations} />
      </div>
    </details>
  );
}
