"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { authFetch } from "@/lib/auth-fetch";

type AuthConfig = {
  resetPasswordRedirectUrl?: string;
  supabaseSetup?: { siteUrl?: string; redirectUrls?: string[]; note?: string };
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState<AuthConfig | null>(null);

  useEffect(() => {
    void authFetch("/api/auth/config")
      .then((r) => r.json() as Promise<AuthConfig>)
      .then(setSetup)
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await authFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as {
        detail?: string;
        message?: string;
        error?: string;
        redirect_to?: string;
      };
      if (!res.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : typeof data.error === "string"
              ? data.error
              : "Could not send reset email",
        );
        return;
      }
      const sentTo = typeof data.redirect_to === "string" ? data.redirect_to : setup?.resetPasswordRedirectUrl;
      setMessage(
        `${typeof data.message === "string" ? data.message : "If an account exists for that email, a password reset link was sent."}${
          sentTo ? ` Link will target: ${sentTo}` : ""
        } Use only the newest email.`,
      );
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
          <h1 className="text-xl font-semibold">Forgot password</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Enter your account email. We will send a link to set a new password.
          </p>
        </div>

        {setup?.supabaseSetup ? (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-medium">Supabase URL configuration (one-time)</p>
            <p>
              <span className="text-gray-600 dark:text-gray-400">Site URL:</span>{" "}
              <code className="break-all">{setup.supabaseSetup.siteUrl}</code>
            </p>
            <p>
              <span className="text-gray-600 dark:text-gray-400">Redirect URL:</span>{" "}
              <code className="break-all">{setup.resetPasswordRedirectUrl}</code>
            </p>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          {message ? <p className="text-sm text-green-700 dark:text-green-400">{message}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#10a37f] text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "…" : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-sm">
          <Link href="/login" className="text-[#10a37f] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
