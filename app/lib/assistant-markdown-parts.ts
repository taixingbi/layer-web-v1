import { normalizeCitationSpacing } from "@/lib/citation-content";

/** Inline citation markers from the model, e.g. ``[1]``, ``[2]`` (not markdown links). */
export const CITE_MARKER_RE = /(\[\d+\])/g;

export function splitAssistantMarkdownParts(content: string): string[] {
  return normalizeCitationSpacing(content).split(CITE_MARKER_RE);
}

export function isCitationMarker(part: string): boolean {
  return /^\[\d+\]$/.test(part);
}

/** True when a markdown segment should use block-level elements (headings, lists, diagrams). */
export function isBlockMarkdownSegment(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^#{1,6}\s/m.test(t)) return true;
  if (/^\s*[-*+]\s/m.test(t)) return true;
  if (/^\s*\d+\.\s/m.test(t)) return true;
  if (/```/.test(t)) return true;
  if (/\n\n/.test(t)) return true;
  return false;
}
