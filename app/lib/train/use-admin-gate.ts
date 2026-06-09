"use client";

import { useCallback, useEffect, useState } from "react";

import { authFetch } from "@/lib/auth-fetch";
import { webApiPaths } from "@/lib/web-api-paths";

export type AdminGateState = "loading" | "signed_out" | "forbidden" | "ok";

export function useAdminGate(): {
  state: AdminGateState;
  error: string | null;
  retry: () => void;
} {
  const [state, setState] = useState<AdminGateState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setState("loading");
    try {
      const me = await authFetch(webApiPaths.auth.me);
      if (!me.ok) {
        setState("signed_out");
        return;
      }
      const meBody = (await me.json()) as { signedIn?: boolean };
      if (!meBody.signedIn) {
        setState("signed_out");
        return;
      }

      const res = await authFetch(webApiPaths.train.access);
      if (res.status === 403) {
        setState("forbidden");
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Request failed (${res.status})`);
        setState("signed_out");
        return;
      }
      setState("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify access");
      setState("signed_out");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, error, retry: load };
}
