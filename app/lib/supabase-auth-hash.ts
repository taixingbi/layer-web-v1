/** Parse Supabase Auth redirect hash (#access_token=… or #error=…). */

export type SupabaseAuthHash =
  | { kind: "session"; access_token: string; refresh_token: string }
  | { kind: "error"; code: string; description: string };

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

export function hashErrorMessage(parsed: Extract<SupabaseAuthHash, { kind: "error" }>): string {
  if (parsed.code === "otp_expired") {
    return "This reset link has expired or was already used. Request a new one (use only the latest email).";
  }
  return parsed.description;
}
