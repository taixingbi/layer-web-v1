/** Helpers for grouping DCGM Prometheus samples per physical GPU. */

export type PromMetricLabels = Record<string, string>;

export type PromSample = {
  metric: PromMetricLabels;
  value: [number, string];
};

/** Stable key across nodes (each node reports gpu=0). */
export function gpuDeviceKey(metric: PromMetricLabels): string {
  const node =
    metric.kubernetes_node?.trim() ||
    metric.node?.trim() ||
    metric.Hostname?.trim() ||
    metric.instance?.trim() ||
    "unknown";
  const gpu = metric.gpu?.trim() || metric.GPU?.trim() || metric.device?.trim() || "0";
  return `${node}::${gpu}`;
}

export function gpuDisplayName(metric: PromMetricLabels): string {
  const node = metric.kubernetes_node?.trim() || metric.node?.trim() || "node";
  const gpu = metric.gpu?.trim() || metric.GPU?.trim() || "0";
  const modelName = metric.modelName?.trim() || metric.model?.trim() || "GPU";
  return `${node} GPU${gpu} ${modelName}`.trim();
}

/** DCGM framebuffer metrics are reported in MiB. */
export function dcgmMibToGb(mib: number): number {
  return Math.round((mib / 1024) * 10) / 10;
}

export function indexPromSamples(rows: PromSample[]): Map<string, PromSample> {
  const out = new Map<string, PromSample>();
  for (const row of rows) {
    out.set(gpuDeviceKey(row.metric), row);
  }
  return out;
}

export function collectGpuKeys(...rowLists: PromSample[][]): string[] {
  const keys = new Set<string>();
  for (const rows of rowLists) {
    for (const row of rows) {
      keys.add(gpuDeviceKey(row.metric));
    }
  }
  return [...keys].sort();
}
