/**
 * Role pills for profile account card.
 */

"use client";

import { roleBadgeClass } from "@/lib/profile-display";

type ProfileRoleBadgesProps = {
  roles: string[] | undefined;
};

export function ProfileRoleBadges({ roles }: ProfileRoleBadgesProps) {
  const list = (roles ?? []).filter((r) => typeof r === "string" && r.trim());
  if (list.length === 0) {
    return <span className="text-sm text-gray-500 dark:text-gray-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((role) => (
        <span key={role} className={roleBadgeClass(role)}>
          {role}
        </span>
      ))}
    </div>
  );
}
