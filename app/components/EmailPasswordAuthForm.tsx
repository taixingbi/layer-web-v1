"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authFetch } from "@/lib/auth-fetch";

type Props = {
  mode: "login" | "signup";
  /** Where to go after success (default `/chat`). Login page sets from `?next=`. */
  redirectAfterAuth?: string;
};

export function EmailPasswordAuthForm({ mode, redirectAfterAuth = "/chat" }: Props) {
  const router = useRouter();
  const afterAuthPath =
    redirectAfterAuth.trim().startsWith("/") ? redirectAfterAuth.trim() : "/chat";
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
  const submitLabel = mode === "login" ? "Sign in" : "Create account";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body =
        mode === "login"
          ? { identifier: identifier.trim(), password }
          : { email: email.trim(), password, username: username.trim() || undefined };
      const res = await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        detail?: string;
        error?: string;
        message?: string;
        signedIn?: boolean;
        email_confirmation_required?: boolean;
      };
      if (!res.ok) {
        const msg =
          typeof data.detail === "string"
            ? data.detail
            : typeof data.message === "string"
              ? data.message
              : typeof data.error === "string"
                ? data.error
                : "Authentication failed";
        setError(msg);
        return;
      }
      if (data.signedIn === false || data.email_confirmation_required) {
        setError(
          "Account created. Confirm your email before signing in, then use the login page.",
        );
        return;
      }
      router.push(afterAuthPath);
      router.refresh();
    } catch {
      setError("Network error. Is the gateway running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" ? (
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
          />
        </div>
      ) : null}
      {mode === "login" ? (
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium mb-1">
            Email or username
          </label>
          <input
            id="identifier"
            type="text"
            required
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
          />
        </div>
      ) : (
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
      )}
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
        />
      </div>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#10a37f] text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "…" : submitLabel}
      </button>
      {mode === "login" ? (
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-[#10a37f] hover:underline">
            Forgot password?
          </Link>
        </p>
      ) : null}
    </form>
  );
}
