/**
 * Request a password-reset email via the auth BFF and gateway.
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ChatBrand } from "@/components/ChatBrand";
import { authFetch } from "@/lib/auth-fetch";

const SUCCESS_MESSAGE =
  "If an account exists for this email, a password reset link has been sent.";

/** Dev-only Supabase dashboard hints from ``GET /api/auth/config``. */
type AuthConfig = {
  resetPasswordRedirectUrl?: string;
  supabaseSetup?: { siteUrl?: string; redirectUrls?: string[]; note?: string };
};

const isDev = process.env.NODE_ENV === "development";

/** Forgot-password form; infra hints only in development. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devSetup, setDevSetup] = useState<AuthConfig | null>(null);

  useEffect(() => {
    if (!isDev) return;
    void authFetch("/api/auth/config")
      .then((r) => r.json() as Promise<AuthConfig>)
      .then((data) => {
        setDevSetup(data);
        if (data.resetPasswordRedirectUrl) {
          console.info("[HuntAI dev] password reset redirect:", data.resetPasswordRedirectUrl);
        }
        if (data.supabaseSetup) {
          console.info("[HuntAI dev] Supabase URL config:", data.supabaseSetup);
        }
      })
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      };

      if (!res.ok) {
        const msg =
          typeof data.detail === "string"
            ? data.detail
            : typeof data.error === "string"
              ? data.error
              : null;
        if (res.status >= 500 || res.status === 502) {
          setError(msg ?? "Something went wrong. Please try again later.");
        } else if (res.status === 400) {
          setError(msg ?? "Enter a valid email address.");
        } else {
          setSubmitted(true);
        }
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white dark:bg-[#0d0d0d] text-[#0d0d0d] dark:text-[#ececec]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <ChatBrand size="md" layout="stacked" className="justify-center" />
        </div>

        {isDev && devSetup?.supabaseSetup ? (
          <div
            className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 space-y-1"
            role="note"
          >
            <p className="font-medium">Dev only — Supabase URL configuration</p>
            <p>
              <span className="text-gray-600 dark:text-gray-400">Site URL:</span>{" "}
              <code className="break-all">{devSetup.supabaseSetup.siteUrl}</code>
            </p>
            <p>
              <span className="text-gray-600 dark:text-gray-400">Redirect URL:</span>{" "}
              <code className="break-all">{devSetup.resetPasswordRedirectUrl}</code>
            </p>
          </div>
        ) : null}

        {submitted ? (
          <div
            className="auth-success-card rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 px-4 py-4 text-sm text-green-800 dark:text-green-200"
            role="status"
          >
            <p className="font-medium mb-1">Check your email</p>
            <p className="leading-relaxed">{SUCCESS_MESSAGE}</p>
            <p className="mt-2 text-xs text-green-700/80 dark:text-green-300/80">
              If you don&apos;t see it, check spam or wait a few minutes before trying again.
            </p>
          </div>
        ) : (
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
                disabled={loading}
                className="auth-input w-full"
                placeholder="you@company.com"
              />
            </div>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <button type="submit" disabled={loading} className="auth-btn-primary w-full">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm">
          <Link href="/login" className="text-[#10a37f] hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
