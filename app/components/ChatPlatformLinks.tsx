"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { authFetch } from "@/lib/auth-fetch";
import { isAdminProfile } from "@/lib/is-admin-profile";
import type { Profile } from "@/lib/profile";
import { webApiPaths } from "@/lib/web-api-paths";

/** Admin-only header links to platform ops pages (Train, Admin). */
export function ChatPlatformLinks() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    void authFetch(webApiPaths.profile)
      .then((r) => (r.ok ? (r.json() as Promise<Profile>) : null))
      .then((data) => {
        if (alive) setIsAdmin(isAdminProfile(data));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <nav className="hidden sm:flex items-center gap-1 text-sm" aria-label="Platform">
      <Link
        href="/train"
        className="px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"
      >
        Train
      </Link>
      <Link
        href="/admin"
        className="px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"
      >
        Admin
      </Link>
    </nav>
  );
}
