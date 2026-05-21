/**
 * Collapsible latency breakdown for assistant messages (gateway + web BFF + client).
 */

import {
  isLatencyObject,
  latencyDisplayTotalMs,
  type LatencyObject,
} from "@/lib/chat-latency";

type Props = {
  latency_ms: LatencyObject;
};

function formatMs(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${Math.round(value)} ms`;
}

function labelForKey(key: string): string {
  return key.replace(/_/g, " ");
}

function LatencyTree({ data, depth = 0 }: { data: LatencyObject; depth?: number }) {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return null;

  return (
    <ul className={depth === 0 ? "mt-1.5 space-y-1 pl-1" : "mt-0.5 space-y-0.5 pl-3 border-l border-gray-200 dark:border-gray-700"}>
      {entries.map(([key, value]) => {
        if (isLatencyObject(value)) {
          return (
            <li key={key} className="text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                {labelForKey(key)}
              </span>
              <LatencyTree data={value} depth={depth + 1} />
            </li>
          );
        }
        const ms = formatMs(value);
        if (ms) {
          return (
            <li key={key} className="text-xs text-gray-500 dark:text-gray-400">
              <span className="capitalize">{labelForKey(key)}</span>: {ms}
            </li>
          );
        }
        if (typeof value === "string" || typeof value === "boolean") {
          return (
            <li key={key} className="text-xs text-gray-500 dark:text-gray-400">
              <span className="capitalize">{labelForKey(key)}</span>: {String(value)}
            </li>
          );
        }
        return null;
      })}
    </ul>
  );
}

function sectionBlocks(latency: LatencyObject): Array<{ title: string; data: LatencyObject }> {
  const blocks: Array<{ title: string; data: LatencyObject }> = [];
  const gateway = latency.gateway_api;
  if (isLatencyObject(gateway)) {
    blocks.push({ title: "Gateway", data: gateway });
  }
  const web = latency.web;
  if (isLatencyObject(web)) {
    const bff = web.bff;
    if (isLatencyObject(bff)) {
      blocks.push({ title: "Web (BFF)", data: bff });
    }
    const client = web.client;
    if (isLatencyObject(client)) {
      blocks.push({ title: "Web (client)", data: client });
    }
    if (blocks.length === 0) {
      blocks.push({ title: "Web", data: web });
    }
  } else if (!isLatencyObject(gateway)) {
    blocks.push({ title: "Latency", data: latency });
  }
  return blocks;
}

export function ChatLatencyDetails({ latency_ms }: Props) {
  const total = latencyDisplayTotalMs(latency_ms);
  const blocks = sectionBlocks(latency_ms);

  if (blocks.length === 0) return null;

  return (
    <details className="mt-2.5 text-sm group">
      <summary className="cursor-pointer text-gray-500 dark:text-gray-400 select-none list-none flex items-center gap-1">
        <span className="text-[10px] transition-transform group-open:rotate-90">▶</span>
        Latency{total != null ? ` (${total} ms)` : ""}
      </summary>
      <div className="mt-1.5 space-y-2">
        {blocks.map(({ title, data }) => (
          <div key={title}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <LatencyTree data={data} />
          </div>
        ))}
      </div>
    </details>
  );
}
