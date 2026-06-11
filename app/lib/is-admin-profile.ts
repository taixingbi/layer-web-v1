/** True when profile roles include admin (case-insensitive). */
export function isAdminProfile(profile: { roles?: string[] } | null | undefined): boolean {
  return (profile?.roles ?? []).some((role) => role.trim().toLowerCase() === "admin");
}
