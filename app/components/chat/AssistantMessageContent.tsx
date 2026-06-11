"use client";

import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import {
  isCitationMarker,
  splitAssistantMarkdownParts,
} from "@/lib/assistant-markdown-parts";

type Props = {
  content: string;
};

export function AssistantMessageContent({ content }: Props) {
  const parts = splitAssistantMarkdownParts(content);
  return (
    <div className="chat-md">
      {parts.map((part, i) => {
        if (!part) return null;
        if (isCitationMarker(part)) {
          return (
            <sup key={i} className="chat-cite-marker">
              {part}
            </sup>
          );
        }
        return <ChatMarkdown key={i} text={part} />;
      })}
    </div>
  );
}
