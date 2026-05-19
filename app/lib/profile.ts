/**
 * User profile types and BFF PATCH whitelist (matches gateway ``profiles`` table).
 */

/** Profile row returned by gateway ``GET /profile`` and ``PATCH /profile``. */
export type Profile = {
  id: string;
  email?: string | null;
  username?: string | null;
  display_name?: string | null;
  roles?: string[];
  team?: string | null;
  group?: string | null;
  plan?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const EDITABLE_KEYS = ["username", "display_name", "team", "group"] as const;

export type ProfilePatchInput = Partial<Pick<Profile, "username" | "display_name" | "team" | "group">>;

/**
 * Keep only user-editable fields for gateway PATCH (drops email, roles, plan, etc.).
 */
export function whitelistProfilePatch(body: Record<string, unknown>): ProfilePatchInput {
  const out: ProfilePatchInput = {};
  for (const key of EDITABLE_KEYS) {
    const v = body[key];
    if (typeof v === "string" && v.trim()) {
      out[key] = v.trim();
    }
  }
  return out;
}

/** True when at least one editable field is present after whitelist. */
export function hasProfilePatchFields(patch: ProfilePatchInput): boolean {
  return Object.keys(patch).length > 0;
}
