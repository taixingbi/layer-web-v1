/** Helpers for grouping DCGM Prometheus samples per physical GPU. */

export type PromMetricLabels = Record<string, string>;

export type PromSample = {
  metric: PromMetricLabels;
  value: [number, string];
};

/** All keys that may identify the same GPU across DCGM metric families. */
export function gpuAliasKeys(metric: PromMetricLabels): string[] {
  const keys = new Set<string>();
  const uuid = metric.UUID?.trim() || metric.uuid?.trim();
  if (uuid) keys.add(`uuid:${uuid}`);

  const gpu = metric.gpu?.trim() || metric.GPU?.trim() || metric.device?.trim() || "0";
  for (const node of [
    metric.kubernetes_node?.trim(),
    metric.node?.trim(),
    metric.Hostname?.trim(),
  ]) {
    if (node) keys.add(`${node}::${gpu}`);
  }

  return [...keys];
}

/** Primary key for listing GPUs in the dashboard (prefer UUID). */
export function canonicalGpuKey(metric: PromMetricLabels): string {
  const aliases = gpuAliasKeys(metric);
  return aliases.find((k) => k.startsWith("uuid:")) ?? aliases[0] ?? "unknown::0";
}

/** @deprecated Use canonicalGpuKey or gpuAliasKeys */
export function gpuDeviceKey(metric: PromMetricLabels): string {
  return canonicalGpuKey(metric);
}

/** Resolve total framebuffer MiB from DCGM gauges (TOTAL is often not exported). */
export function dcgmTotalMib(usedMib: number, freeMib: number, totalMib: number): number | null {
  if (Number.isFinite(totalMib) && totalMib > 0) return totalMib;
  if (Number.isFinite(usedMib) && Number.isFinite(freeMib) && usedMib >= 0 && freeMib >= 0) {
    return usedMib + freeMib;
  }
  return null;
}

/** Normalize DCGM memory reading to MiB (exporter uses MiB; some builds use bytes). */
export function dcgmRawToMib(raw: number): number | null {
  if (!Number.isFinite(raw) || raw < 0) return null;
  // RTX 3090 ~= 24576 MiB; values above ~128 GiB in "MiB" are almost certainly bytes.
  if (raw > 131_072) return raw / (1024 * 1024);
  return raw;
}

export function gpuDisplayName(metric: PromMetricLabels): string {
  const node =
    metric.kubernetes_node?.trim() ||
    metric.node?.trim() ||
    metric.Hostname?.trim() ||
    "node";
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
    for (const key of gpuAliasKeys(row.metric)) {
      if (!out.has(key)) out.set(key, row);
    }
  }
  return out;
}

export function lookupPromSample(
  map: Map<string, PromSample>,
  reference: PromMetricLabels,
): PromSample | undefined {
  for (const key of gpuAliasKeys(reference)) {
    const hit = map.get(key);
    if (hit) return hit;
  }
  return undefined;
}

export function collectGpuKeys(...rowLists: PromSample[][]): string[] {
  const keys = new Set<string>();
  for (const rows of rowLists) {
    for (const row of rows) {
      keys.add(canonicalGpuKey(row.metric));
    }
  }
  return [...keys].sort();
}
