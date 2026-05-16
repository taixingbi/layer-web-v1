"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type Props = {
  submitLabel: string;
  redirectPath?: string;
};

export function AccessTokenSessionForm({ submitLabel, redirectPath = "/chat" }: Props) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const finish = useCallback(() => {
    try {
      sessionStorage.removeItem("layer_bearer_token");
    } catch {
      /* ignore */
    }
    router.push(redirectPath);
    router.refresh();
  }, [router, redirectPath]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const trimmed = token.trim();
      if (!trimmed) {
        setError("Enter an access token.");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: trimmed }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error ?? `Request failed (${res.status})`);
          return;
        }
        setToken("");
        finish();
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    },
    [token, finish]
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Access token
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={4}
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm font-mono text-[#0d0d0d] dark:text-[#ececec] focus:outline-none focus:ring-2 focus:ring-[#10a37f]"
          placeholder="Paste access token (JWT)"
          disabled={loading}
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#10a37f] text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
