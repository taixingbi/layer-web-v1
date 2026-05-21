import { citationExcerpt, citationHref, citationTitle } from "@/lib/citations";
import type { ChatCitation } from "@/lib/chat-types";

type Props = {
  citations: ChatCitation[];
};

export function CitationList({ citations }: Props) {
  if (citations.length === 0) return null;
  return (
    <details className="mt-2.5 text-sm group">
      <summary className="cursor-pointer text-gray-500 dark:text-gray-400 select-none list-none flex items-center gap-1">
        <span className="text-[10px] transition-transform group-open:rotate-90">▶</span>
        Sources ({citations.length})
      </summary>
      <ul className="mt-1.5 space-y-2 pl-1 border-l border-gray-200 dark:border-gray-700">
        {citations.map((c, i) => {
          const title = citationTitle(c, i);
          const href = citationHref(c);
          const excerpt = citationExcerpt(c);
          return (
            <li key={i} className="pl-3 text-gray-600 dark:text-gray-300">
              <div className="font-medium text-gray-800 dark:text-gray-200">
                {href ? (
                  <a
                    href={href}
                    className="underline hover:text-[#10a37f]"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {title}
                  </a>
                ) : (
                  title
                )}
              </div>
              {excerpt ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                  {excerpt}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
