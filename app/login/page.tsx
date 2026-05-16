"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoEmail, setDemoEmail] = useState("");
  const [demoPassword, setDemoPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/config")
      .then((r) => r.json() as Promise<{ demoLogin?: boolean }>)
      .then((j) => {
        if (!cancelled && j.demoLogin) setDemoEnabled(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const finishLogin = useCallback(() => {
    try {
      sessionStorage.removeItem("layer_bearer_token");
    } catch {
      /* ignore */
    }
    router.push("/chat");
    router.refresh();
  }, [router]);

  const submitToken = useCallback(
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
        finishLogin();
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    },
    [token, finishLogin]
  );

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
        finishLogin();
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    },
    [demoEmail, demoPassword, finishLogin]
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white dark:bg-[#0d0d0d] text-[#0d0d0d] dark:text-[#ececec]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Store your gateway access token in an httpOnly cookie for <code className="text-xs">/api/chat</code> and{" "}
            <code className="text-xs">/api/feedback</code>. Use a JWT accepted by your gateway when{" "}
            <code className="text-xs">AUTH_MODE=jwt</code>.
          </p>
        </div>

        <form onSubmit={submitToken} className="space-y-4">
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
            {loading ? "Signing in…" : "Sign in with token"}
          </button>
        </form>

        {demoEnabled ? (
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
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1a1a1a] disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in (demo)"}
            </button>
          </form>
        ) : null}

        <p className="text-center text-sm">
          <Link href="/chat" className="text-[#10a37f] hover:underline">
            Continue to chat without signing in
          </Link>{" "}
          <span className="text-gray-400">(uses server </span>
          <code className="text-xs text-gray-500">GATEWAY_BEARER_TOKEN</code>
          <span className="text-gray-400"> when stub)</span>
        </p>
        <p className="text-center text-sm">
          <Link href="/" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
