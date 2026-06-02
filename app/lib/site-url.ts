/**
 * Public site origin for SEO metadata, sitemap, and canonical URLs.
 */

/** Strip trailing slash from a URL string. */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Resolve the public web origin (no trailing slash).
 * Uses ``APP_URL`` or ``NEXT_PUBLIC_SITE_URL``; falls back to localhost for dev builds.
 */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  if (fromEnv) return stripTrailingSlash(fromEnv);
  return "http://localhost:3000";
}
