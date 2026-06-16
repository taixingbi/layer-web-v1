"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminGate, AdminShell } from "@/components/admin/AdminShell";
import { authFetch } from "@/lib/auth-fetch";
import { webApiPaths } from "@/lib/web-api-paths";

type GuestEvent = {
  id?: string | null;
  created_at?: string | null;
  prompt?: string | null;
  route?: string | null;
  answer_preview?: string | null;
  latency_ms?: Record<string, unknown> | null;
  session_id?: string | null;
  trace_id?: string | null;
  client_ip?: string | null;
};

type GuestHistoryResponse = { events?: GuestEvent[] };

function latencyMs(v: GuestEvent["latency_ms"]): string {
  if (!v || typeof v !== "object") return "—";
  const total = (v as { total_ms?: unknown }).total_ms;
  if (typeof total === "number" && Number.isFinite(total)) return `${Math.round(total)}ms`;
  return "—";
}

export default function AdminGuestHistoryPage() {
  const [events, setEvents] = useState<GuestEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const me = await authFetch(webApiPaths.auth.me);
      if (!me.ok) {
        setError("Sign in required");
        setEvents([]);
        return;
      }
      const meBody = (await me.json()) as { signedIn?: boolean };
      if (!meBody.signedIn) {
        setError("Sign in required");
        setEvents([]);
        return;
      }

      const res = await authFetch(webApiPaths.admin.guestHistory);
      if (res.status === 403) {
        setForbidden(true);
        setEvents([]);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
        setError(body.error ?? body.detail ?? `Request failed (${res.status})`);
        setEvents([]);
        return;
      }
      setForbidden(false);
      const data = (await res.json()) as GuestHistoryResponse;
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load guest history");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      title="Guest history"
      subtitle="Read-only audit stream for visitor chat sessions."
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => setShowDetails((prev) => !prev)}
          >
            {showDetails ? "Hide details" : "Show details"}
          </button>
          <button type="button" className="admin-btn-secondary" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      }
    >
      <AdminGate loading={loading} forbidden={forbidden} error={error} onRetry={() => void load()}>
        {events.length === 0 ? (
          <p className="admin-muted">No guest events yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Prompt</th>
                  <th>Answer</th>
                  <th>Route</th>
                  {showDetails ? <th>Latency</th> : null}
                  {showDetails ? <th>Session</th> : null}
                  {showDetails ? <th>Trace</th> : null}
                  {showDetails ? <th>IP</th> : null}
                </tr>
              </thead>
              <tbody>
                {events.map((row, idx) => (
                  <tr key={row.id ?? `${row.created_at ?? "t"}-${idx}`}>
                    <td>{row.created_at ?? "—"}</td>
                    <td>{row.prompt?.trim() ? row.prompt : "—"}</td>
                    <td>{row.answer_preview?.trim() ? row.answer_preview : "—"}</td>
                    <td>{row.route?.trim() ? row.route : "—"}</td>
                    {showDetails ? <td>{latencyMs(row.latency_ms)}</td> : null}
                    {showDetails ? <td>{row.session_id?.trim() ? row.session_id : "—"}</td> : null}
                    {showDetails ? <td>{row.trace_id?.trim() ? row.trace_id : "—"}</td> : null}
                    {showDetails ? <td>{row.client_ip?.trim() ? row.client_ip : "—"}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminGate>
    </AdminShell>
  );
}
