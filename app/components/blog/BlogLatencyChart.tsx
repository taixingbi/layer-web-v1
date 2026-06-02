/**
 * Illustrative latency breakdown bar chart for blog articles.
 */

type Segment = {
  label: string;
  ms: number;
  color: string;
};

const SEGMENTS: Segment[] = [
  { label: "Rewrite", ms: 180, color: "#14b8a6" },
  { label: "Route", ms: 120, color: "#0ea5e9" },
  { label: "Retrieve", ms: 340, color: "#6366f1" },
  { label: "Rerank", ms: 210, color: "#8b5cf6" },
  { label: "Generate", ms: 520, color: "#f59e0b" },
];

const TOTAL_MS = SEGMENTS.reduce((sum, s) => sum + s.ms, 0);

export function BlogLatencyChart() {
  return (
    <figure className="blog-latency-chart" aria-label="Illustrative orchestrator latency breakdown">
      <figcaption className="blog-pre-caption">
        Illustrative latency breakdown for a routed RAG request (~{TOTAL_MS} ms end-to-end)
      </figcaption>
      <div className="blog-latency-bar" role="img">
        {SEGMENTS.map((segment) => (
          <div
            key={segment.label}
            className="blog-latency-segment"
            style={{
              width: `${(segment.ms / TOTAL_MS) * 100}%`,
              backgroundColor: segment.color,
            }}
            title={`${segment.label}: ${segment.ms} ms`}
          />
        ))}
      </div>
      <div className="blog-latency-axis" aria-hidden="true">
        <span>0 ms</span>
        <span>{Math.round(TOTAL_MS / 4)} ms</span>
        <span>{Math.round(TOTAL_MS / 2)} ms</span>
        <span>{Math.round((TOTAL_MS * 3) / 4)} ms</span>
        <span>{TOTAL_MS} ms</span>
      </div>
      <ul className="blog-latency-legend">
        {SEGMENTS.map((segment) => (
          <li key={segment.label}>
            <span className="blog-latency-swatch" style={{ backgroundColor: segment.color }} />
            <span>{segment.label}</span>
            <span className="blog-latency-ms">{segment.ms} ms</span>
          </li>
        ))}
      </ul>
      <p className="blog-latency-note">
        HuntAI returns nested <code>latency_ms</code> on every response—router, RAG retrieval,
        rerank, and generation are reported separately so you can see where time is spent.
      </p>
    </figure>
  );
}
