"use client";

import { useCallback, useState } from "react";

type Props = {
  onSuccess: () => void;
  submitLabel?: string;
};

export function DemoEnvLoginForm({ onSuccess, submitLabel = "Sign in (demo)" }: Props) {
  const [demoEmail, setDemoEmail] = useState("");
  const [demoPassword, setDemoPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitDemo = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/auth/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: demoEmail, password: demoPassword }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error ?? `Request failed (${res.status})`);
          return;
        }
        setDemoPassword("");
        onSuccess();
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    },
    [demoEmail, demoPassword, onSuccess]
  );

  return (
    <form onSubmit={submitDemo} className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-8">
      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Demo account (env)</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Set <code className="font-mono">AUTH_DEMO_EMAIL</code>, <code className="font-mono">AUTH_DEMO_PASSWORD</code>, and{" "}
        <code className="font-mono">AUTH_DEMO_ACCESS_TOKEN</code> on the server (local testing only).
      </p>
      <label className="block text-sm text-gray-700 dark:text-gray-300">
        Email
        <input
          type="email"
          value={demoEmail}
          onChange={(e) => setDemoEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm"
          autoComplete="username"
          disabled={loading}
        />
      </label>
      <label className="block text-sm text-gray-700 dark:text-gray-300">
        Password
        <input
          type="password"
          value={demoPassword}
          onChange={(e) => setDemoPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm"
          autoComplete="current-password"
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
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1a1a1a] disabled:opacity-50"
      >
        {loading ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
