/**
 * Parse BFF SSE frames in the browser (same block format as gateway upstream).
 */

import { parseSseBlock } from "@/lib/gateway-chat";

export function splitSseBuffer(buffer: string): { remainder: string; blocks: string[] } {
  const parts = buffer.split("\n\n");
  return { remainder: parts.pop() ?? "", blocks: parts };
}

export function eventFromSseBlock(block: string): { event: string; data: unknown } | null {
  const parsed = parseSseBlock(block);
  if (!parsed) return null;
  try {
    return { event: parsed.event, data: JSON.parse(parsed.dataRaw) as unknown };
  } catch {
    return null;
  }
}
