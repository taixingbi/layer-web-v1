import type { ChatCitation } from "@/lib/chat-types";

export function citationTitle(c: ChatCitation, index: number): string {
  if (typeof c.title === "string" && c.title.trim()) return c.title;
  if (typeof c.source === "string" && c.source.trim()) return c.source;
  if (typeof c.cite_id === "number") return `Source [${c.cite_id}]`;
  return `Source ${index + 1}`;
}

export function citationHref(c: ChatCitation): string | null {
  if (typeof c.url === "string" && c.url.trim()) return c.url;
  if (typeof c.source_url === "string" && c.source_url.trim()) return c.source_url;
  return null;
}

export function citationScore(c: ChatCitation): number | null {
  const score =
    typeof c.rerank_score === "number"
      ? c.rerank_score
      : typeof c.score === "number"
        ? c.score
        : null;
  if (score == null || !Number.isFinite(score)) return null;
  return score;
}

export function citationRank(c: ChatCitation, index: number): number | null {
  if (typeof c.rank === "number" && Number.isFinite(c.rank)) return c.rank;
  if (typeof c.cite_id === "number" && Number.isFinite(c.cite_id)) return c.cite_id;
  return index + 1;
}

export function citationChunkLabel(c: ChatCitation): string | null {
  if (typeof c.chunk_id === "string" && c.chunk_id.trim()) return c.chunk_id.trim();
  if (typeof c.chunk_id === "number") return `#${c.chunk_id}`;
  return null;
}

export function citationExcerpt(c: ChatCitation): string | null {
  if (typeof c.text === "string" && c.text.trim()) {
    const t = c.text.trim();
    return t.length > 280 ? `${t.slice(0, 280)}…` : t;
  }
  return null;
}
