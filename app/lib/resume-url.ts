/**
 * Resume PDF paths and canonical download URL (bundled under public/resume/).
 */

export const RESUME_PDF_FILENAME = "Taixing_Bi_Resume.pdf";

const RESUME_PDF_RELATIVE = `/resume/${RESUME_PDF_FILENAME}`;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function fromEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === "") return "";
  return v.split("#")[0].trim().replace(/^["']|["']$/g, "").trim();
}

/** Relative URL served from Next.js public/ (works on any host). */
export function resumePdfPath(): string {
  return RESUME_PDF_RELATIVE;
}

/**
 * Absolute URL for RAG metadata, SEO, or external share.
 * Prefers NEXT_PUBLIC_RESUME_CANONICAL_URL, then site origin + path.
 */
export function resumePdfAbsoluteUrl(): string {
  const canonical = fromEnv("NEXT_PUBLIC_RESUME_CANONICAL_URL");
  if (canonical) return canonical;

  const site =
    fromEnv("NEXT_PUBLIC_SITE_URL") ||
    fromEnv("APP_URL") ||
    fromEnv("NEXT_PUBLIC_APP_URL");
  if (site) return `${stripTrailingSlash(site)}${RESUME_PDF_RELATIVE}`;

  return RESUME_PDF_RELATIVE;
}
