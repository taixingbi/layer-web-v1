"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { parseSupabaseAuthHash } from "@/lib/supabase-auth-hash";

/** Supabase recovery emails land on Site URL with hash; forward to /auth/reset-password. */
export function RecoveryHashRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || hash === "#") return;
    const parsed = parseSupabaseAuthHash(hash);
    if (!parsed) return;
    if (pathname === "/auth/reset-password") return;
    router.replace(`/auth/reset-password${hash}`);
  }, [pathname, router]);

  return null;
}
