/**
 * Profile dashboard: account overview and editable public details.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileRoleBadges } from "@/components/ProfileRoleBadges";
import { authFetch } from "@/lib/auth-fetch";
import type { Profile } from "@/lib/profile";
import {
  formatJoinedMonthYear,
  formatMemberSince,
  formatPlanLabel,
  profileDisplayTitle,
  profileHeadline,
  profileInitials,
} from "@/lib/profile-display";

function errorMessage(data: Record<string, unknown>, fallback: string): string {
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.error === "string") return data.error;
  return fallback;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500";

/** Profile edit form (authenticated). */
export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [team, setTeam] = useState("");
  const [department, setDepartment] = useState("");
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
        setDepartment(data.group ?? "");
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
          group: department.trim(),
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
      setDepartment(data.group ?? "");
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
      <div className="profile-page min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  const title = profileDisplayTitle(profile);
  const headline = profileHeadline(profile);
  const planLabel = formatPlanLabel(profile?.plan);
  const memberSince = formatMemberSince(profile?.created_at);
  const joinedShort = formatJoinedMonthYear(profile?.created_at);

  return (
    <div className="profile-page min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-[#0d0d0d] dark:text-[#ececec]">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0d0d0d]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/chat" className="text-sm text-[#10a37f] hover:underline">
            ← Back to chat
          </Link>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Account</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 pb-12">
        <nav className="flex gap-1 mb-6 p-1 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] w-fit" aria-label="Account sections">
          <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-[#2f2f2f] shadow-sm text-gray-900 dark:text-gray-100">
            Profile
          </span>
          <span className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-400 dark:text-gray-600 cursor-not-allowed" title="Coming soon">
            Security
          </span>
          <span className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-400 dark:text-gray-600 cursor-not-allowed" title="Coming soon">
            API keys
          </span>
        </nav>

        {profile ? (
          <section className="profile-card profile-hero-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <ProfileAvatar initials={profileInitials(profile)} size="lg" />
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight truncate">{title}</h1>
                {headline ? (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{headline}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {planLabel ? (
                    <span className="profile-plan-badge text-xs font-medium px-2.5 py-1 rounded-full">
                      {planLabel}
                    </span>
                  ) : null}
                  {joinedShort ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{joinedShort}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {profile ? (
          <section className="profile-card p-5 sm:p-6 mt-6 space-y-4" aria-labelledby="account-info-heading">
            <h2 id="account-info-heading" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Account info
            </h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400 mb-0.5">Email</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{profile.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400 mb-1.5">Roles</dt>
                <dd>
                  <ProfileRoleBadges roles={profile.roles} />
                </dd>
              </div>
              {memberSince ? (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400 mb-0.5">Member since</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{memberSince}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        <section className="profile-card p-5 sm:p-6 mt-6" aria-labelledby="edit-profile-heading">
          <h2 id="edit-profile-heading" className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Public profile
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
            Update how you appear in chat and across the platform.
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                Username
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                System identity (login handle). Use lowercase, no spaces.
              </p>
              <input
                id="username"
                type="text"
                required
                minLength={1}
                maxLength={64}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="taixingbi"
              />
            </div>
            <div>
              <label htmlFor="display_name" className="block text-sm font-medium mb-1">
                Display name
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Editable label shown to you and others (e.g. your full name).
              </p>
              <input
                id="display_name"
                type="text"
                required
                minLength={1}
                maxLength={128}
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
                placeholder="Taixing Bi"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                  className={inputClass}
                  placeholder="AI Platform"
                />
              </div>
              <div>
                <label htmlFor="department" className="block text-sm font-medium mb-1">
                  Department
                </label>
                <input
                  id="department"
                  type="text"
                  required
                  minLength={1}
                  maxLength={64}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={inputClass}
                  placeholder="Engineering"
                />
              </div>
            </div>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            {message ? <p className="text-sm text-green-700 dark:text-green-400">{message}</p> : null}
            <div className="pt-1">
              <button
                type="submit"
                disabled={saving}
                className="profile-save-btn rounded-xl px-6 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>

        <p className="mt-8 text-center text-sm">
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="text-gray-600 dark:text-gray-300 hover:underline"
          >
            Sign out
          </button>
        </p>
      </main>
    </div>
  );
}
