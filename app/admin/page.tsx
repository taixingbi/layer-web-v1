"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminGate, AdminShell } from "@/components/admin/AdminShell";
import { authFetch } from "@/lib/auth-fetch";
import type { AdminOverviewPayload } from "@/lib/admin/types";
import { webApiPaths } from "@/lib/web-api-paths";

const REFRESH_MS = 30_000;

export default function AdminPage() {
  const [data, setData] = useState<AdminOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const me = await authFetch(webApiPaths.auth.me);
      if (!me.ok) {
        setForbidden(false);
        setError("Sign in required");
        setData(null);
        return;
      }
      const meBody = (await me.json()) as { signedIn?: boolean };
      if (!meBody.signedIn) {
        setError("Sign in required");
        setData(null);
        return;
      }

      const res = await authFetch(webApiPaths.admin.overview);
      if (res.status === 403) {
        setForbidden(true);
        setData(null);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Request failed (${res.status})`);
        setData(null);
        return;
      }
      setForbidden(false);
      setData((await res.json()) as AdminOverviewPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <AdminShell
      title="Overview"
      subtitle="Platform health, AI pipeline metrics, and recent activity."
      actions={
        data ? (
          <button type="button" className="admin-btn-secondary" onClick={() => void load()}>
            Refresh
          </button>
        ) : null
      }
    >
      <AdminGate loading={loading && !data} forbidden={forbidden} error={error} onRetry={() => void load()}>
        {data ? <AdminDashboard data={data} /> : null}
      </AdminGate>
    </AdminShell>
  );
}
