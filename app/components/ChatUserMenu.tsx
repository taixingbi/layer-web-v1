/**
 * Avatar dropdown for signed-in chat header (profile, sign out).
 */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { isAdminProfile } from "@/lib/is-admin-profile";
import type { Profile } from "@/lib/profile";
import { webApiPaths } from "@/lib/web-api-paths";

type ProfileSnippet = Pick<Profile, "display_name" | "username" | "email" | "roles">;

function initialsFromProfile(p: ProfileSnippet | null): string {
  const name = p?.display_name?.trim() || p?.username?.trim() || p?.email?.trim() || "U";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function displayName(p: ProfileSnippet | null): string {
  return (
    p?.display_name?.trim() ||
    p?.username?.trim() ||
    p?.email?.split("@")[0] ||
    "Account"
  );
}

type ChatUserMenuProps = {
  onSignOut: () => void | Promise<void>;
};

export function ChatUserMenu({ onSignOut }: ChatUserMenuProps) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileSnippet | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    void authFetch(webApiPaths.profile)
      .then((r) => (r.ok ? (r.json() as Promise<ProfileSnippet>) : null))
      .then((data) => {
        if (alive && data) setProfile(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const name = displayName(profile);
  const initials = initialsFromProfile(profile);
  const isAdmin = isAdminProfile(profile);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="chat-user-menu-trigger flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="chat-user-avatar flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden sm:inline text-sm font-medium text-gray-800 dark:text-gray-200 max-w-[8rem] truncate">
          {name}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`hidden sm:block text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2f2f2f] shadow-lg py-1 z-50"
        >
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</p>
            {profile?.email ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile.email}</p>
            ) : null}
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={close}
            className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            Profile
          </Link>
          {isAdmin ? (
            <>
              <Link
                href="/train"
                role="menuitem"
                onClick={close}
                className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Training
              </Link>
              <Link
                href="/admin"
                role="menuitem"
                onClick={close}
                className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Admin
              </Link>
            </>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              void onSignOut();
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
