"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { isBlockMarkdownSegment } from "@/lib/assistant-markdown-parts";
import { normalizeChatLinkHref } from "@/lib/chat-link";

const CHAT_MARKDOWN_PLUGINS = [remarkGfm, remarkBreaks];

const sharedMarkdownComponents: Components = {
  h1: ({ children }) => <h1 className="chat-md-h1">{children}</h1>,
  h2: ({ children }) => <h2 className="chat-md-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="chat-md-h3">{children}</h3>,
  ul: ({ children }) => <ul className="chat-md-ul">{children}</ul>,
  ol: ({ children }) => <ol className="chat-md-ol">{children}</ol>,
  li: ({ children }) => <li className="chat-md-li">{children}</li>,
  a: ({ href, children }) => {
    const normalized = normalizeChatLinkHref(href);
    const external =
      normalized?.startsWith("http://") || normalized?.startsWith("https://");
    return (
      <a
        href={normalized}
        className="chat-md-link"
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  pre: ({ children }) => <pre className="chat-md-pre">{children}</pre>,
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return <code className="chat-md-code">{children}</code>;
  },
  strong: ({ children }) => <strong className="chat-md-strong">{children}</strong>,
};

const blockMarkdownComponents: Components = {
  ...sharedMarkdownComponents,
  p: ({ children }) => <p className="chat-md-p">{children}</p>,
};

const inlineMarkdownComponents: Components = {
  ...sharedMarkdownComponents,
  p: ({ children }) => <span className="chat-md-inline">{children}</span>,
};

type Props = {
  text: string;
};

/** Render one markdown segment (citation markers are split out upstream). */
export function ChatMarkdown({ text }: Props) {
  if (!text.trim()) return null;
  const components = isBlockMarkdownSegment(text)
    ? blockMarkdownComponents
    : inlineMarkdownComponents;
  return (
    <ReactMarkdown remarkPlugins={CHAT_MARKDOWN_PLUGINS} components={components}>
      {text}
    </ReactMarkdown>
  );
}
