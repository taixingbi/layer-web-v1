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
      aria-label="Download resume PDF"
    >
      Resume
    </a>
  );
}
export function ChatPlatformLinks() {
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let alive = true;

    void authFetch(webApiPaths.auth.me)
      .then((r) => (r.ok ? (r.json() as Promise<{ signedIn?: boolean }>) : { signedIn: false }))
      .then(async (me) => {
        if (!alive) return;
        const loggedIn = Boolean(me.signedIn);
        setSignedIn(loggedIn);

        if (!loggedIn) {
          setIsAdmin(false);
          setAuthReady(true);
          return;
        }

        const profileRes = await authFetch(webApiPaths.profile);
        if (!alive) return;
        if (profileRes.ok) {
          const profile = (await profileRes.json()) as Profile;
          setIsAdmin(isAdminProfile(profile));
        } else {
          setIsAdmin(false);
        }
        setAuthReady(true);
      })
      .catch(() => {
        if (alive) {
          setSignedIn(false);
          setIsAdmin(false);
          setAuthReady(true);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  const showUpload = authReady && signedIn && isAdmin;
  const showDownload = authReady && !showUpload;

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Platform">
      {showUpload ? <ResumeAdminUploadLink /> : null}
      {showDownload ? <ResumePdfLink /> : null}
      <div className="hidden sm:flex items-center gap-1">
        <Link href="/blog" className={linkClass}>
          Blog
        </Link>
        {showUpload ? (
          <Link href="/admin" className={linkClass}>
            Dashboard
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
