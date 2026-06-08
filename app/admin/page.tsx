"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { ChatBrand } from "@/components/ChatBrand";
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
    <div className="admin-page min-h-screen">
      <header className="admin-header">
        <div className="admin-header-inner">
          <ChatBrand size="sm" layout="row" />
          <span className="admin-header-title">Platform</span>
          <nav className="admin-header-nav">
            <Link href="/chat" className="admin-nav-link">
              Chat
            </Link>
            <button type="button" className="admin-nav-link admin-nav-link--active" aria-current="page">
              Admin
            </button>
          </nav>
        </div>
      </header>

      <main className="admin-main">
        {loading && !data ? (
          <p className="admin-muted">Loading dashboard…</p>
        ) : forbidden ? (
          <div className="admin-alert">
            <h1 className="admin-alert-title">Admin access required</h1>
            <p className="admin-muted">Your account does not have the admin role.</p>
            <Link href="/chat" className="admin-btn-secondary">
              Back to chat
            </Link>
          </div>
        ) : error && !data ? (
          <div className="admin-alert">
            <h1 className="admin-alert-title">Unable to load dashboard</h1>
            <p className="admin-muted">{error}</p>
            {error === "Sign in required" ? (
              <Link href="/login" className="admin-btn-secondary">
                Sign in
              </Link>
            ) : (
              <button type="button" className="admin-btn-secondary" onClick={() => void load()}>
                Retry
              </button>
            )}
          </div>
        ) : data ? (
          <AdminDashboard data={data} onRefresh={() => void load()} />
        ) : null}
      </main>
    </div>
  );
}
