/**
 * Argo CD Application API client for admin deploy page.
 */

import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

import { adminConfig } from "@/lib/admin/config";
import type {
  AdminArgoCdAppDetail,
  AdminArgoCdAppSummary,
  AdminArgoCdOverview,
} from "@/lib/admin/types";

type ArgoApplication = {
  metadata?: { name?: string; namespace?: string };
  spec?: {
    source?: { path?: string; targetRevision?: string; repoURL?: string };
    destination?: { namespace?: string };
  };
  status?: {
    sync?: { status?: string; revision?: string };
    health?: { status?: string; message?: string };
    reconciledAt?: string;
    operationState?: {
      finishedAt?: string;
      startedAt?: string;
      phase?: string;
      message?: string;
    };
    summary?: { images?: string[] };
    history?: Array<{
      id?: number;
      deployedAt?: string;
      revision?: string;
      source?: { targetRevision?: string };
    }>;
  };
};

type ArgoAppList = { items?: ArgoApplication[] };

async function argocdRequest(path: string): Promise<{ ok: boolean; status: number; body: string }> {
  const base = adminConfig.argocdServerUrl.replace(/\/$/, "");
  const token = adminConfig.argocdToken;
  if (!base || !token) {
    return { ok: false, status: 0, body: "" };
  }
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);

  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = lib(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        rejectUnauthorized: !adminConfig.argocdInsecureTls,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          resolve({ ok: status >= 200 && status < 300, status, body });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(adminConfig.argocdTimeoutMs, () => {
      req.destroy(new Error("Argo CD request timeout"));
    });
    req.end();
  });
}

function envFromAppName(name: string): string {
  if (name.endsWith("-prod")) return "prod";
  if (name.endsWith("-dev")) return "dev";
  return "—";
}

function imageShaFromImages(images: string[] | undefined): string | null {
  if (!images?.length) return null;
  const img = images[0];
  const tagMatch = img.match(/:([a-f0-9]{7,12})$/i);
  if (tagMatch) return tagMatch[1].slice(0, 7);
  const digestMatch = img.match(/@sha256:([a-f0-9]{7,12})/i);
  if (digestMatch) return digestMatch[1].slice(0, 7);
  const parts = img.split(":");
  return parts[parts.length - 1]?.slice(0, 12) ?? null;
}

function mapSyncStatus(raw: string | undefined): AdminArgoCdAppSummary["sync"] {
  const s = (raw ?? "").toLowerCase();
  if (s === "synced") return "Synced";
  if (s === "outofsync") return "OutOfSync";
  return "Unknown";
}

function mapHealthStatus(raw: string | undefined): AdminArgoCdAppSummary["health"] {
  const s = (raw ?? "").toLowerCase();
  if (s === "healthy") return "Healthy";
  if (s === "degraded") return "Degraded";
  if (s === "progressing") return "Progressing";
  if (s === "missing") return "Missing";
  if (s === "suspended") return "Suspended";
  return "Unknown";
}

function relativeMinutes(iso: string | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return new Date(t).toISOString().slice(0, 16).replace("T", " ");
}

function toSummary(app: ArgoApplication): AdminArgoCdAppSummary | null {
  const name = app.metadata?.name?.trim();
  if (!name) return null;
  const syncRaw = app.status?.sync?.status;
  const healthRaw = app.status?.health?.status;
  const lastSync =
    app.status?.operationState?.finishedAt ??
    app.status?.reconciledAt ??
    app.status?.history?.[0]?.deployedAt;
  return {
    name,
    env: envFromAppName(name),
    sync: mapSyncStatus(syncRaw),
    health: mapHealthStatus(healthRaw),
    imageSha: imageShaFromImages(app.status?.summary?.images),
    gitRevision: app.status?.sync?.revision?.slice(0, 12) ?? null,
    lastDeploy: lastSync ?? null,
    lastDeployLabel: relativeMinutes(lastSync ?? undefined),
    overlay: app.spec?.source?.path ?? null,
    namespace: app.spec?.destination?.namespace ?? null,
    uiUrl: `${adminConfig.argocdUiUrl.replace(/\/$/, "")}/applications/argocd/${name}`,
  };
}

function toDetail(app: ArgoApplication): AdminArgoCdAppDetail | null {
  const summary = toSummary(app);
  if (!summary) return null;
  return {
    ...summary,
    repoUrl: app.spec?.source?.repoURL ?? null,
    targetRevision: app.spec?.source?.targetRevision ?? null,
    images: app.status?.summary?.images ?? [],
    healthMessage: app.status?.health?.message ?? null,
    syncRevision: app.status?.sync?.revision ?? null,
    history: (app.status?.history ?? []).slice(0, 10).map((h) => ({
      id: h.id ?? 0,
      deployedAt: h.deployedAt ?? "",
      revision: h.revision?.slice(0, 12) ?? "",
    })),
  };
}

export async function fetchArgoCdOverview(): Promise<AdminArgoCdOverview> {
  if (!adminConfig.argocdConfigured) {
    return {
      fetchedAt: new Date().toISOString(),
      source: "unconfigured",
      apps: [],
      syncedCount: 0,
      healthyCount: 0,
      totalCount: 0,
      outOfSyncApps: [],
      lastSyncLabel: null,
      detail: "Set ARGOCD_SERVER_URL and ARGOCD_TOKEN",
    };
  }

  try {
    const res = await argocdRequest("/api/v1/applications");
    if (!res.ok) {
      return {
        fetchedAt: new Date().toISOString(),
        source: "error",
        apps: [],
        syncedCount: 0,
        healthyCount: 0,
        totalCount: 0,
        outOfSyncApps: [],
        lastSyncLabel: null,
        detail: `Argo CD HTTP ${res.status}: ${res.body.slice(0, 200)}`,
      };
    }
    const data = JSON.parse(res.body) as ArgoAppList;
    const apps = (data.items ?? [])
      .map(toSummary)
      .filter((a): a is AdminArgoCdAppSummary => a != null)
      .sort((a, b) => a.name.localeCompare(b.name));

    const huntaiApps = apps.filter((a) =>
      /^(web|orchestrator|rag-query|gateway|mcp-github|qdrant|observability|vllm|cloudflared)-/.test(
        a.name,
      ) || a.name.includes("-dev") || a.name.includes("-prod"),
    );
    const list = huntaiApps.length > 0 ? huntaiApps : apps;

    const syncedCount = list.filter((a) => a.sync === "Synced").length;
    const healthyCount = list.filter((a) => a.health === "Healthy").length;
    const outOfSyncApps = list.filter((a) => a.sync === "OutOfSync").map((a) => a.name);
    const latest = list
      .map((a) => a.lastDeploy)
      .filter(Boolean)
      .sort()
      .reverse()[0];

    return {
      fetchedAt: new Date().toISOString(),
      source: "argocd",
      apps: list,
      syncedCount,
      healthyCount,
      totalCount: list.length,
      outOfSyncApps,
      lastSyncLabel: relativeMinutes(latest ?? undefined),
      uiBaseUrl: adminConfig.argocdUiUrl,
    };
  } catch (err) {
    return {
      fetchedAt: new Date().toISOString(),
      source: "error",
      apps: [],
      syncedCount: 0,
      healthyCount: 0,
      totalCount: 0,
      outOfSyncApps: [],
      lastSyncLabel: null,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchArgoCdApp(name: string): Promise<AdminArgoCdAppDetail | null> {
  if (!adminConfig.argocdConfigured) return null;
  const safe = encodeURIComponent(name.trim());
  try {
    const res = await argocdRequest(`/api/v1/applications/${safe}`);
    if (!res.ok) return null;
    const app = JSON.parse(res.body) as ArgoApplication;
    return toDetail(app);
  } catch {
    return null;
  }
}
