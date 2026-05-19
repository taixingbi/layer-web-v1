import { describe, expect, it } from "vitest";

import { maskPasswordResetLandingUrl, parseSupabaseAuthHash } from "./supabase-auth-hash";

describe("maskPasswordResetLandingUrl", () => {
  const page = "http://192.168.86.179:30186/auth/reset-password";

  it("masks session hash with type=recovery", () => {
    const hash =
      "#access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.x&refresh_token=rt_secret&type=recovery";
    expect(maskPasswordResetLandingUrl(page, hash)).toBe(
      `${page}#access_token=...&refresh_token=...&type=recovery`,
    );
  });

  it("masks error hash", () => {
    const hash = "#error=access_denied&error_code=otp_expired&error_description=Email+link+invalid";
    expect(maskPasswordResetLandingUrl(page, hash)).toBe(
      `${page}#error=access_denied&error_code=otp_expired&error_description=...`,
    );
  });

  it("returns base URL when hash is empty or unparseable", () => {
    expect(maskPasswordResetLandingUrl(page, "")).toBe(page);
    expect(maskPasswordResetLandingUrl(page, "#foo=bar")).toBe(page);
  });

  it("defaults type to recovery when missing", () => {
    const hash = "#access_token=abc&refresh_token=def";
    expect(parseSupabaseAuthHash(hash)?.kind).toBe("session");
    expect(maskPasswordResetLandingUrl(page, hash)).toBe(
      `${page}#access_token=...&refresh_token=...&type=recovery`,
    );
  });
});
