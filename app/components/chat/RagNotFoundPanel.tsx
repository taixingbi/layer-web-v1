import type { RagNotFoundMeta } from "@/lib/rag-envelope";

type Props = {
  notFound: RagNotFoundMeta;
};

function formatSourceLabel(source: string): string {
  return source.replace(/_/g, " ");
}

export function RagNotFoundPanel({ notFound }: Props) {
  const summary = notFound.search_summary;
  const chunkCount = summary?.chunk_count ?? 0;
  const sources = Array.isArray(summary?.sources)
    ? summary!.sources!.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];

  if (chunkCount <= 0 && sources.length === 0) {
    return null;
  }

  const chunkLabel = chunkCount === 1 ? "knowledge chunk" : "knowledge chunks";

  return (
    <div className="chat-rag-not-found-summary">
      <p className="chat-rag-not-found-heading">Search Summary</p>
      <p className="chat-rag-not-found-line">
        Searched {chunkCount} {chunkLabel}
        {sources.length > 0 ? " across:" : "."}
      </p>
      {sources.length > 0 ? (
        <ul className="chat-rag-not-found-sources">
          {sources.map((source) => (
            <li key={source}>{formatSourceLabel(source)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
