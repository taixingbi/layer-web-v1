/**
 * Set a new password after Supabase recovery email (hash tokens in URL).
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authFetch } from "@/lib/auth-fetch";
import { reportResetLinkOpened } from "@/lib/report-reset-link-opened";
import { hashErrorMessage, parseSupabaseAuthHash } from "@/lib/supabase-auth-hash";

/** Parses recovery hash, reports link-opened for logs, posts new password to BFF. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<{ access_token: string; refresh_token: string } | null>(null);
  const [hashError, setHashError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash && typeof window !== "undefined") {
      void reportResetLinkOpened(
        hash,
        window.location.origin + window.location.pathname,
      );
    }
    const parsed = parseSupabaseAuthHash(hash);
    if (!parsed) {
      setTokens(null);
      setHashError(null);
      return;
    }
    if (parsed.kind === "error") {
      setTokens(null);
      setHashError(hashErrorMessage(parsed));
      return;
    }
    setHashError(null);
    setTokens({ access_token: parsed.access_token, refresh_token: parsed.refresh_token });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tokens) {
      setError("Invalid or expired reset link. Request a new one from forgot password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || undefined,
          password,
        }),
      });
      const data = (await res.json()) as { detail?: string; message?: string; error?: string };
      if (!res.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : typeof data.error === "string"
              ? data.error
              : "Could not reset password",
        );
        return;
      }
      router.push("/chat");
      router.refresh();
    } catch {
      setError("Network error. Is the gateway running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white dark:bg-[#0d0d0d] text-[#0d0d0d] dark:text-[#ececec]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Set new password</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Choose a new password for your account.
          </p>
        </div>

        {!tokens ? (
          <p className="text-sm text-red-600 dark:text-red-400 text-center">
            {hashError ?? "This reset link is invalid or has expired."}{" "}
            <Link href="/forgot-password" className="text-[#10a37f] hover:underline">
              Request a new link
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium mb-1">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#10a37f] text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "…" : "Update password"}
            </button>
          </form>
        )}

        <p className="text-center text-sm">
          <Link href="/login" className="text-[#10a37f] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
