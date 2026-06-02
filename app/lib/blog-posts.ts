/**
 * Blog post registry for index pages, sitemap, and shared metadata.
 */

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  tags: string[];
  readingTimeMinutes: number;
};

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "building-an-ai-orchestrator",
    title: "From Prompt to Response: Inside HuntAI's Orchestrator",
    description:
      "How HuntAI routes requests across layer-orchestrator-v1, RAG, GitHub MCP, and vLLM—with real SSE events, router golden tests, nested latency, and k3s GitOps deployment.",
    publishedAt: "2026-06-01",
    updatedAt: "2026-06-01",
    tags: [
      "HuntAI",
      "AI orchestrator",
      "production RAG",
      "router evaluation",
      "SSE streaming",
      "observability",
      "k3s GitOps",
    ],
    readingTimeMinutes: 14,
  },
];

export function getBlogPost(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function blogPostPath(slug: string): string {
  return `/blog/${slug}`;
}
