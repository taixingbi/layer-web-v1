/**
 * Shared Supabase PostgREST fetch helpers (service role / secret key).
 */

import { adminConfig } from "@/lib/admin/config";

export type SupabaseRow = Record<string, unknown>;

export function supabaseAuthHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: key,
    Accept: "application/json",
  };
  if (key.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

/** GET ``/rest/v1/{path}``; returns null when unconfigured or on error. */
export async function supabaseGet(path: string): Promise<SupabaseRow[] | null> {
  const base = adminConfig.supabaseUrl;
  const key = adminConfig.supabaseServiceKey;
  if (!base || !key) return null;
  try {
    const res = await fetch(`${base}/rest/v1/${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(adminConfig.supabaseTimeoutMs),
      headers: supabaseAuthHeaders(key),
    });
    if (!res.ok) return null;
    return (await res.json()) as SupabaseRow[];
  } catch {
    return null;
  }
}
