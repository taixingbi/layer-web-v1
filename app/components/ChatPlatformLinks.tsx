"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { authFetch } from "@/lib/auth-fetch";
import { isAdminProfile } from "@/lib/is-admin-profile";
import type { Profile } from "@/lib/profile";
import { webApiPaths } from "@/lib/web-api-paths";

const linkClass =
  "px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10";

/** Chat header links: public Blog plus admin-only Train and Admin. */
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

  return (
    <nav className="hidden sm:flex items-center gap-1 text-sm" aria-label="Platform">
      <Link href="/blog" className={linkClass}>
        Blog
      </Link>
      {isAdmin ? (
        <>
          <Link href="/train" className={linkClass}>
            Train
          </Link>
          <Link href="/admin" className={linkClass}>
            Admin
          </Link>
        </>
      ) : null}
    </nav>
  );
}
