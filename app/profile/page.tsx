/**
 * Profile settings: view and update username, display name, team, and group after login.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { authFetch } from "@/lib/auth-fetch";
import type { Profile } from "@/lib/profile";

function errorMessage(data: Record<string, unknown>, fallback: string): string {
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.error === "string") return data.error;
  return fallback;
}

/** Profile edit form (authenticated). */
export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [team, setTeam] = useState("");
  const [group, setGroup] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setError(null);
    const me = await authFetch("/api/auth/me");
    const meJson = (await me.json()) as { signedIn?: boolean };
    if (!me.ok || !meJson.signedIn) {
      router.replace("/login?next=/profile");
      return null;
    }

    const res = await authFetch("/api/profile");
    const data = (await res.json()) as Profile & { detail?: string; error?: string };
    if (!res.ok) {
      if (res.status === 401) {
        router.replace("/login?next=/profile");
        return null;
      }
      setError(errorMessage(data, "Could not load profile"));
      return null;
    }
    return data;
  }, [router]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const data = await loadProfile();
      if (!alive) return;
      if (data) {
        setProfile(data);
        setUsername(data.username ?? "");
        setDisplayName(data.display_name ?? "");
        setTeam(data.team ?? "");
        setGroup(data.group ?? "");
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [loadProfile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await authFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          display_name: displayName.trim(),
          team: team.trim(),
          group: group.trim(),
        }),
      });
      const data = (await res.json()) as Profile & { detail?: string; error?: string };
      if (!res.ok) {
        setError(errorMessage(data, "Could not save profile"));
        return;
      }
      setProfile(data);
      setUsername(data.username ?? "");
      setDisplayName(data.display_name ?? "");
      setTeam(data.team ?? "");
      setGroup(data.group ?? "");
      setMessage("Profile saved.");
    } catch {
      setError("Network error. Is the gateway running?");
    } finally {
      setSaving(false);
    }
  }

  async function onSignOut() {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0d0d0d] text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-white dark:bg-[#0d0d0d] text-[#0d0d0d] dark:text-[#ececec]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Profile</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Update your account details.
          </p>
        </div>

        {profile ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>
              <span className="text-gray-500 dark:text-gray-500">Email:</span>{" "}
              {profile.email ?? "—"}
            </p>
            <p>
              <span className="text-gray-500 dark:text-gray-500">Roles:</span>{" "}
              {(profile.roles ?? []).join(", ") || "—"}
            </p>
            <p>
              <span className="text-gray-500 dark:text-gray-500">Plan:</span> {profile.plan ?? "—"}
            </p>
            {profile.created_at ? (
              <p>
                <span className="text-gray-500 dark:text-gray-500">Member since:</span>{" "}
                {profile.created_at}
              </p>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              minLength={1}
              maxLength={64}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium mb-1">
              Display name
            </label>
            <input
              id="display_name"
              type="text"
              required
              minLength={1}
              maxLength={128}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="team" className="block text-sm font-medium mb-1">
              Team
            </label>
            <input
              id="team"
              type="text"
              required
              minLength={1}
              maxLength={64}
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="group" className="block text-sm font-medium mb-1">
              Group
            </label>
            <input
              id="group"
              type="text"
              required
              minLength={1}
              maxLength={64}
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          {message ? <p className="text-sm text-green-700 dark:text-green-400">{message}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[#10a37f] text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "…" : "Save changes"}
          </button>
        </form>

        <p className="text-center text-sm flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-4">
          <Link href="/chat" className="text-[#10a37f] hover:underline">
            Back to chat
          </Link>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="text-gray-600 dark:text-gray-300 hover:underline"
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}
