/** Elapsed milliseconds since ``performance.now()`` start (one decimal). */
export function msSince(start: number): number {
  return Math.round((performance.now() - start) * 1000) / 1000;
}
