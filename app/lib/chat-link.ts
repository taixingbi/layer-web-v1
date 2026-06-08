/** Normalize assistant markdown link targets (GitHub blog blobs → site blog paths). */

const GITHUB_BLOG_BLOB_RE =
  /github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\/app\/blog\/([^/]+)\/page\.tsx/i;

export function normalizeChatLinkHref(href: string | undefined): string | undefined {
  if (!href) return href;
  const match = href.match(GITHUB_BLOG_BLOB_RE);
  if (match) return `/blog/${match[1]}`;
  return href;
}
