/**
 * Profile avatar with initials (upload placeholder for later).
 */

"use client";

type ProfileAvatarProps = {
  initials: string;
  size?: "lg" | "md";
};

export function ProfileAvatar({ initials, size = "lg" }: ProfileAvatarProps) {
  const dim = size === "lg" ? "w-20 h-20 text-2xl" : "w-12 h-12 text-base";
  return (
    <div className="flex flex-col items-center sm:items-start gap-3">
      <div
        className={`profile-avatar ${dim} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
        aria-hidden
      >
        {initials}
      </div>
      <button
        type="button"
        disabled
        title="Photo upload coming soon"
        className="text-xs text-gray-400 dark:text-gray-500 cursor-not-allowed"
      >
        Change photo
      </button>
    </div>
  );
}
