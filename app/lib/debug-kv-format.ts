/** Dot-padded key/value lines for execution-timeline hover panels. */

export function formatDebugKvLine(
  label: string,
  value: string,
  labelWidth = 18,
): string {
  const dots = Math.max(1, labelWidth - label.length);
  return `${label}${".".repeat(dots)} ${value}`;
}
