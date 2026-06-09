import type { Profile } from "@/lib/profile";

/** True when gateway profile roles include admin (case-insensitive). */
export function isAdminProfile(profile: Profile | null | undefined): boolean {
  return (profile?.roles ?? []).some((role) => role.trim().toLowerCase() === "admin");
}
