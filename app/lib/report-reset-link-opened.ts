import { authFetch } from "@/lib/auth-fetch";
import { maskPasswordResetLandingUrl, parseSupabaseAuthHash } from "@/lib/supabase-auth-hash";

let reported = false;

/** Report masked reset landing URL once per page load (logging only). */
export async function reportResetLinkOpened(hash: string, pageUrl: string): Promise<void> {
  if (reported || typeof window === "undefined") return;
  if (!hash || hash === "#") return;
  const parsed = parseSupabaseAuthHash(hash);
  if (!parsed) return;
  reported = true;

  const landing_url_masked = maskPasswordResetLandingUrl(pageUrl, hash);
  try {
    await authFetch("/api/auth/reset-link-opened", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landing_url_masked,
        kind: parsed.kind,
      }),
    });
  } catch {
    // Logging must not block reset flow.
  }
}
