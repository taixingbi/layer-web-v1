/**
 * External observability links for the chat debug panel (client-side).
 */

const GITHUB_ORG = "taixingbi";

/** HuntAI Grafana Cloud stack (override with NEXT_PUBLIC_GRAFANA_BASE_URL). */
const GRAFANA_BASE =
  process.env.NEXT_PUBLIC_GRAFANA_BASE_URL?.replace(/\/$/, "") ||
  "https://taixingbi.grafana.net";

function substitute(template: string, traceId: string): string {
  return template.replace(/\{trace_id\}/g, encodeURIComponent(traceId));
}

/** LangSmith run/trace search URL, or null when trace id missing. */
export function langsmithTraceUrl(traceId: string | undefined): string | null {
  const id = traceId?.trim();
  if (!id) return null;
  const template = process.env.NEXT_PUBLIC_LANGSMITH_TRACE_URL?.trim();
  if (template) return substitute(template, id);
  return `https://smith.langchain.com/?search=${encodeURIComponent(id)}`;
}

/** Grafana Cloud Explore → Loki log search for ``trace_id`` (last 24h). */
function defaultGrafanaExploreUrl(traceId: string): string {
  const lokiDatasource =
    process.env.NEXT_PUBLIC_GRAFANA_LOKI_DATASOURCE?.trim() || "grafanacloud-logs";
  const panes = {
    huntai: {
      datasource: lokiDatasource,
      queries: [
        {
          refId: "A",
          expr: `|= ${JSON.stringify(traceId)}`,
          queryType: "range",
        },
      ],
      range: { from: "now-24h", to: "now" },
    },
  };
  const params = new URLSearchParams({
    schemaVersion: "1",
    panes: JSON.stringify(panes),
    orgId: "1",
  });
  return `${GRAFANA_BASE}/explore?${params.toString()}`;
}

/** Grafana stack home (no trace filter). */
export function grafanaHomeUrl(): string {
  return `${GRAFANA_BASE}/`;
}

/** Grafana explore/trace URL from env template, or default Loki search on taixingbi.grafana.net. */
export function grafanaTraceUrl(traceId: string | undefined): string | null {
  const id = traceId?.trim();
  if (!id) return null;
  const template = process.env.NEXT_PUBLIC_GRAFANA_TRACE_URL?.trim();
  if (template) return substitute(template, id);
  return defaultGrafanaExploreUrl(id);
}

/** HuntAI platform GitHub org page (code overview). */
export function huntaiGitHubUrl(): string {
  return `https://github.com/${GITHUB_ORG}`;
}
