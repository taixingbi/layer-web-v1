import { citationExcerpt, citationHref, citationTitle } from "@/lib/citations";
import type { ChatCitation } from "@/lib/chat-types";

type Props = {
  citations: ChatCitation[];
};

/** Source list body (used inside merged metadata expand). */
export function CitationSourceList({ citations }: Props) {
  if (citations.length === 0) return null;
  return (
    <ul className="chat-source-list">
      {citations.map((c, i) => {
        const title = citationTitle(c, i);
        const href = citationHref(c);
        const excerpt = citationExcerpt(c);
        return (
          <li key={i}>
            <div className="chat-source-title">
              {href ? (
                <a href={href} target="_blank" rel="noreferrer">
                  {title}
                </a>
              ) : (
                title
              )}
            </div>
            {excerpt ? <p className="chat-source-excerpt">{excerpt}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
