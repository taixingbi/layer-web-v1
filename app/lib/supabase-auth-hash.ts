/** Parse and mask Supabase Auth redirect hash fragments (#access_token=… or #error=…). */

/** Parsed Supabase Auth redirect hash (session tokens or error). */
export type SupabaseAuthHash =
  | { kind: "session"; access_token: string; refresh_token: string }
  | { kind: "error"; code: string; description: string };

/**
 * Parse URL hash from Supabase email redirect into session tokens or error.
 */
export function parseSupabaseAuthHash(hash: string): SupabaseAuthHash | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  const params = new URLSearchParams(raw);

  const error = params.get("error")?.trim();
  if (error) {
    const code = params.get("error_code")?.trim() || error;
    const description =
      params.get("error_description")?.trim().replace(/\+/g, " ") ||
      "This link is invalid or has expired.";
    return { kind: "error", code, description };
  }

  const access_token = params.get("access_token")?.trim() ?? "";
  if (!access_token) return null;
  return {
    kind: "session",
    access_token,
    refresh_token: params.get("refresh_token")?.trim() ?? "",
  };
}

/**
 * Build a log-safe landing URL (literal ``...`` placeholders, never real tokens).
 */
export function maskPasswordResetLandingUrl(pageUrl: string, hash: string): string {
  const base = pageUrl.split("#")[0];
  const parsed = parseSupabaseAuthHash(hash);
  if (!parsed) return base;
  if (parsed.kind === "error") {
    const code = parsed.code || "unknown";
    return `${base}#error=access_denied&error_code=${code}&error_description=...`;
  }
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const type = params.get("type")?.trim() || "recovery";
  return `${base}#access_token=...&refresh_token=...&type=${type}`;
}

/** User-facing message for hash error codes (e.g. ``otp_expired``). */
export function hashErrorMessage(parsed: Extract<SupabaseAuthHash, { kind: "error" }>): string {
  if (parsed.code === "otp_expired") {
    return "This reset link has expired or was already used. Request a new one (use only the latest email).";
  }
  return parsed.description;
}
