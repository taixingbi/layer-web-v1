/**
 * Build a request timeline view model from merged ``latency_ms`` envelopes.
 */

import { gatewayTotalMs, isLatencyObject, latencyDisplayTotalMs, type LatencyObject } from "@/lib/chat-latency";

export type LatencyTimelineNode = {
  id: string;
  label: string;
  ms: number;
  percent: number;
  children: LatencyTimelineNode[];
  rank?: number;
};

export type SlowestOperation = {
  rank: number;
  label: string;
  ms: number;
  percent: number;
};

export type LatencyTimelineView = {
  totalMs: number;
  totalSecondsLabel: string;
  tree: LatencyTimelineNode[];
  slowest: SlowestOperation[];
};

function roundMs(value: number): number {
  return Math.round(value);
}

function readMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return roundMs(value);
}

function pct(ms: number, rootMs: number): number {
  if (rootMs <= 0) return 0;
  return Math.round((ms / rootMs) * 100);
}

function node(
  id: string,
  label: string,
  ms: number,
  rootMs: number,
  children: LatencyTimelineNode[] = [],
): LatencyTimelineNode {
  return { id, label, ms, percent: pct(ms, rootMs), children };
}

function gatewayApi(latency: LatencyObject): LatencyObject | undefined {
  const gw = latency.gateway_api;
  if (isLatencyObject(gw)) return gw;
  if ("auth" in latency || "storage" in latency || "orchestrator" in latency) {
    return latency;
  }
  return undefined;
}

function ragChildNodes(rag: LatencyObject, rootMs: number, prefix: string): LatencyTimelineNode[] {
  const out: LatencyTimelineNode[] = [];

  const retrieval = rag.retrieval;
  if (isLatencyObject(retrieval)) {
    const pairs: Array<[string, string]> = [
      ["embed", "Embed"],
      ["retrieve", "Retrieve"],
      ["rerank", "Rerank"],
    ];
    for (const [key, label] of pairs) {
      const ms = readMs(retrieval[key]);
      if (ms != null && ms > 0) out.push(node(`${prefix}-retrieval-${key}`, label, ms, rootMs));
    }
  }

  const generation = rag.generation;
  if (isLatencyObject(generation)) {
    const answer = readMs(generation.answer);
    if (answer != null && answer > 0) {
      out.push(node(`${prefix}-generation-answer`, "Chat", answer, rootMs));
    }
    const followUp = readMs(generation.follow_up);
    if (followUp != null && followUp > 0) {
      out.push(node(`${prefix}-generation-follow_up`, "Follow-up Chat", followUp, rootMs));
    }
  }

  const service = rag.service;
  if (isLatencyObject(service)) {
    const pairs: Array<[string, string]> = [
      ["embed", "Embed"],
      ["retrieve", "Retrieve"],
      ["chunk_rerank", "Rerank"],
      ["chat", "Chat"],
      ["follow_up_chat", "Follow-up Chat"],
      ["follow_up_rerank", "Follow-up Rerank"],
    ];
    for (const [key, label] of pairs) {
      const ms = readMs(service[key]);
      if (ms != null && ms > 0) out.push(node(`${prefix}-service-${key}`, label, ms, rootMs));
    }
  }

  const flatPairs: Array<[string, string]> = [
    ["embed", "Embed"],
    ["retrieve", "Retrieve"],
    ["rerank", "Rerank"],
    ["chunk_rerank", "Rerank"],
    ["chat", "Chat"],
    ["follow_up_chat", "Follow-up Chat"],
    ["follow_up_rerank", "Follow-up Rerank"],
  ];
  for (const [key, label] of flatPairs) {
    if (out.some((n) => n.label === label)) continue;
    const ms = readMs(rag[key]);
    if (ms != null && ms > 0) out.push(node(`${prefix}-rag-${key}`, label, ms, rootMs));
  }

  return out;
}

function buildGatewayBranch(gw: LatencyObject, rootMs: number): LatencyTimelineNode[] {
  const children: LatencyTimelineNode[] = [];

  const auth = readMs(gw.auth);
  if (auth != null && auth > 0) children.push(node("auth", "Auth", auth, rootMs));

  const validation = readMs(gw.validation);
  if (validation != null && validation > 0) {
    children.push(node("validation", "Validation", validation, rootMs));
  }

  const storage = gw.storage;
  if (isLatencyObject(storage)) {
    const storageTotal = readMs(storage.total) ?? 0;
    const storageChildren: LatencyTimelineNode[] = [];
    const writeUser = readMs(storage.write_user_message);
    if (writeUser != null && writeUser > 0) {
      storageChildren.push(node("storage-write-user", "User Message Write", writeUser, rootMs));
    }
    const writeAssistant = readMs(storage.write_assistant_message);
    if (writeAssistant != null && writeAssistant > 0) {
      storageChildren.push(
        node("storage-write-assistant", "Assistant Message Write", writeAssistant, rootMs),
      );
    }
    if (storageTotal > 0 || storageChildren.length > 0) {
      children.push(
        node(
          "storage",
          "Storage",
          storageTotal > 0 ? storageTotal : storageChildren.reduce((s, c) => s + c.ms, 0),
          rootMs,
          storageChildren,
        ),
      );
    }
  }

  const orch = gw.orchestrator;
  if (isLatencyObject(orch)) {
    const proxyTotal = readMs(orch.proxy_total);
    const workflow = orch.workflow;
    if (isLatencyObject(workflow)) {
      const workflowTotal = readMs(workflow.total) ?? proxyTotal ?? 0;
      const workflowChildren: LatencyTimelineNode[] = [];

      const router = readMs(workflow.intent_router);
      if (router != null && router > 0) {
        workflowChildren.push(node("intent-router", "Router", router, rootMs));
      }

      const rag = workflow.rag;
      if (isLatencyObject(rag)) {
        const ragTotal = readMs(rag.total) ?? 0;
        const ragChildren = ragChildNodes(rag, rootMs, "rag");
        if (ragTotal > 0 || ragChildren.length > 0) {
          workflowChildren.push(
            node(
              "rag",
              "RAG",
              ragTotal > 0 ? ragTotal : ragChildren.reduce((s, c) => s + c.ms, 0),
              rootMs,
              ragChildren,
            ),
          );
        }
      }

      const orchMs =
        proxyTotal != null && proxyTotal > 0
          ? proxyTotal
          : workflowTotal > 0
            ? workflowTotal
            : workflowChildren.reduce((s, c) => s + c.ms, 0);

      children.push(
        node("orchestrator", "Orchestrator", orchMs, rootMs, [
          node(
            "workflow",
            "Workflow",
            workflowTotal > 0 ? workflowTotal : workflowChildren.reduce((s, c) => s + c.ms, 0),
            rootMs,
            workflowChildren,
          ),
        ]),
      );
    } else if (proxyTotal != null && proxyTotal > 0) {
      children.push(node("orchestrator", "Orchestrator", proxyTotal, rootMs));
    }
  }

  return children;
}

const SLOWEST_SKIP_LABELS = new Set([
  "Web Client",
  "BFF Route",
  "Gateway",
  "Orchestrator",
  "Workflow",
  "RAG",
]);

function flattenForSlowest(nodes: LatencyTimelineNode[]): LatencyTimelineNode[] {
  const out: LatencyTimelineNode[] = [];
  const walk = (list: LatencyTimelineNode[]) => {
    for (const n of list) {
      if (n.ms > 0 && !SLOWEST_SKIP_LABELS.has(n.label)) {
        out.push(n);
      }
      if (n.children.length > 0) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

function assignRanks(tree: LatencyTimelineNode[], slowest: SlowestOperation[]): void {
  const rankByLabel = new Map<string, number>();
  for (const s of slowest) {
    if (!rankByLabel.has(s.label)) rankByLabel.set(s.label, s.rank);
  }
  const walk = (nodes: LatencyTimelineNode[]) => {
    for (const n of nodes) {
      const r = rankByLabel.get(n.label);
      if (r != null) n.rank = r;
      walk(n.children);
    }
  };
  walk(tree);
}

/** Format seconds for the timeline header (e.g. ``4.84s``). */
export function formatTimelineSeconds(totalMs: number): string {
  return `${(totalMs / 1000).toFixed(2)}s`;
}

/** Build timeline tree + slowest operations for UI rendering. */
export function buildLatencyTimelineView(latency: LatencyObject): LatencyTimelineView | null {
  const totalMs = latencyDisplayTotalMs(latency);
  if (totalMs == null || totalMs <= 0) return null;

  const web = latency.web;
  const gw = gatewayApi(latency);
  const gwTotal = gw ? gatewayTotalMs(gw) : 0;

  const bffObj = isLatencyObject(web) && isLatencyObject(web.bff) ? web.bff : null;
  const hasBff =
    bffObj != null && (readMs(bffObj.route) != null || readMs(bffObj.total) != null);

  const clientMs =
    isLatencyObject(web) && isLatencyObject(web.client)
      ? readMs(web.client.total) ?? totalMs
      : totalMs;

  const bffRoute = hasBff
    ? readMs(bffObj!.route) ?? readMs(bffObj!.total) ?? clientMs
    : 0;

  const gatewayNodeMs = gwTotal > 0 ? gwTotal : hasBff ? Math.max(0, bffRoute - 0) : clientMs;

  const gatewayBranch = node(
    "gateway",
    "Gateway",
    gatewayNodeMs > 0 ? gatewayNodeMs : clientMs,
    totalMs,
    gw ? buildGatewayBranch(gw, totalMs) : [],
  );

  const tree: LatencyTimelineNode[] = [
    node(
      "client",
      "Web Client",
      clientMs,
      totalMs,
      hasBff
        ? [
            node("bff", "BFF Route", bffRoute > 0 ? bffRoute : clientMs, totalMs, [gatewayBranch]),
          ]
        : [gatewayBranch],
    ),
  ];

  const candidates = flattenForSlowest(tree);
  const byLabel = new Map<string, LatencyTimelineNode>();
  for (const c of candidates) {
    const prev = byLabel.get(c.label);
    if (!prev || c.ms > prev.ms) byLabel.set(c.label, c);
  }
  const sorted = [...byLabel.values()].sort((a, b) => b.ms - a.ms);
  const slowest: SlowestOperation[] = sorted.slice(0, 5).map((n, i) => ({
    rank: i + 1,
    label: n.label,
    ms: n.ms,
    percent: n.percent,
  }));

  assignRanks(tree, slowest);

  return {
    totalMs,
    totalSecondsLabel: formatTimelineSeconds(totalMs),
    tree,
    slowest,
  };
}

/** Pad label + dots so ``ms`` column aligns (monospace). */
export function formatTimelineLine(
  label: string,
  ms: number,
  percent: number,
  opts?: { rank?: number; prefix?: string; connector?: string; labelWidth?: number },
): string {
  const prefix = opts?.prefix ?? "";
  const connector = opts?.connector ?? "└─ ";
  const labelWidth = opts?.labelWidth ?? 22;
  const rankTag = opts?.rank != null ? ` [#${opts.rank}]` : "";
  const labelPart = label.padEnd(labelWidth, " ");
  const minDots = 6;
  const msPart = `${ms} ms (${percent}%)${rankTag}`;
  const used = prefix.length + connector.length + labelPart.length + 1;
  const dots = Math.max(minDots, 52 - used - msPart.length);
  return `${prefix}${connector}${labelPart} ${".".repeat(dots)} ${msPart}`;
}
