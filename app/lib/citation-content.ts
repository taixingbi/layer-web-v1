/** Collapse whitespace before inline citation markers (``[1]``). */
export function normalizeCitationSpacing(content: string): string {
  return content.replace(/\s+(\[\d+\])/g, "$1").replace(/(\[\d+\])\s+(?=[.,!?;:])/g, "$1");
}
