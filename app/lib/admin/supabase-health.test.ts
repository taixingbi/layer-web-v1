import { describe, expect, it } from "vitest";

import { probeSupabaseHealth } from "@/lib/admin/supabase-health";

describe("probeSupabaseHealth", () => {
  it("returns unknown when Supabase is not configured", async () => {
    const prevUrl = process.env.SUPABASE_URL;
    const prevKey = process.env.SUPABASE_SERVICE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    try {
      const result = await probeSupabaseHealth();
      expect(result.id).toBe("supabase");
      expect(result.status).toBe("unknown");
    } finally {
      if (prevUrl) process.env.SUPABASE_URL = prevUrl;
      if (prevKey) process.env.SUPABASE_SERVICE_KEY = prevKey;
    }
  });
});
