import {
  citationChunkLabel,
  citationExcerpt,
  citationHref,
  citationRank,
  citationScore,
  citationTitle,
} from "@/lib/citations";
import type { ChatCitation } from "@/lib/chat-types";

type Props = {
  citations: ChatCitation[];
};

/** Source cards for the debug panel. */
export function CitationSourceList({ citations }: Props) {
  if (citations.length === 0) return null;
  return (
    <ul className="chat-source-cards">
      {citations.map((c, i) => {
        const title = citationTitle(c, i);
        const href = citationHref(c);
        const excerpt = citationExcerpt(c);
        const score = citationScore(c);
        const rank = citationRank(c, i);
        const chunk = citationChunkLabel(c);
        return (
          <li key={i} className="chat-source-card">
            <div className="chat-source-card-header">
              <span className="chat-source-card-rank">Source #{rank}</span>
              {score != null ? (
                <span className="chat-source-card-score">Score {score.toFixed(2)}</span>
              ) : null}
              {chunk ? <span className="chat-source-card-chunk">Chunk {chunk}</span> : null}
            </div>
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
