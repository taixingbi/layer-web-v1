/**
 * Profile page display helpers (dates, labels, initials).
 */

import type { Profile } from "@/lib/profile";

/** Human-readable join date from gateway ``created_at`` (ISO or EST string). */
export function formatMemberSince(createdAt: string | null | undefined): string | null {
  if (!createdAt?.trim()) return null;
  const normalized = createdAt.trim().replace(/\s+(EDT|EST)$/i, "");
  const date = new Date(normalized.includes("T") ? normalized : normalized.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Short join label, e.g. ``Joined May 2026``. */
export function formatJoinedMonthYear(createdAt: string | null | undefined): string | null {
  if (!createdAt?.trim()) return null;
  const normalized = createdAt.trim().replace(/\s+(EDT|EST)$/i, "");
  const date = new Date(normalized.includes("T") ? normalized : normalized.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return null;
  return `Joined ${date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
}

/** Two-letter initials for avatar. */
export function profileInitials(profile: Profile | null): string {
  if (!profile) return "?";
  const name = profile.display_name?.trim() || profile.username?.trim() || profile.email?.trim() || "U";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Primary title for dashboard header. */
export function profileDisplayTitle(profile: Profile | null): string {
  if (!profile) return "Account";
  return profile.display_name?.trim() || profile.username?.trim() || profile.email?.split("@")[0] || "Account";
}

/** Subtitle under name (team + department). */
export function profileHeadline(profile: Profile | null): string | null {
  if (!profile) return null;
  const team = profile.team?.trim();
  const dept = profile.group?.trim();
  if (team && dept) return `${team} · ${dept}`;
  return team || dept || null;
}

/** Capitalized plan label, e.g. ``Pro plan``. */
export function formatPlanLabel(plan: string | null | undefined): string | null {
  if (!plan?.trim()) return null;
  const p = plan.trim();
  return `${p.charAt(0).toUpperCase()}${p.slice(1)} plan`;
}

/** CSS class for role badge by role name. */
export function roleBadgeClass(role: string): string {
  const r = role.toLowerCase();
  if (r === "admin") return "profile-role-badge profile-role-badge--admin";
  if (r === "user") return "profile-role-badge profile-role-badge--user";
  return "profile-role-badge profile-role-badge--default";
}
