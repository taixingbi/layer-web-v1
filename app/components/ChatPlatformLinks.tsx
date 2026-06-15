"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { authFetch } from "@/lib/auth-fetch";
import { isAdminProfile } from "@/lib/is-admin-profile";
import { ResumeAdminUploadLink } from "@/components/ResumeAdminUploadLink";
import { RESUME_PDF_FILENAME, resumePdfPath } from "@/lib/resume-url";
import type { Profile } from "@/lib/profile";
import { webApiPaths } from "@/lib/web-api-paths";

const linkClass =
  "px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10";

/** Direct PDF download (bundled at /resume/Taixing_Bi_Resume.pdf). */
export function ResumePdfLink({ className = linkClass }: { className?: string }) {
  return (
    <a
      href={resumePdfPath()}
      download={RESUME_PDF_FILENAME}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      Resume
    </a>
  );
}

/** Chat header links: Resume (all breakpoints) plus Blog / Admin on sm+. */
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
    <nav className="flex items-center gap-1 text-sm" aria-label="Platform">
      {isAdmin ? <ResumeAdminUploadLink /> : <ResumePdfLink />}
      <div className="hidden sm:flex items-center gap-1">
        <Link href="/blog" className={linkClass}>
          Blog
        </Link>
        {isAdmin ? (
          <Link href="/admin" className={linkClass}>
            Admin
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
