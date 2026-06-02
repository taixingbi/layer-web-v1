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
    title: "Building an AI Orchestrator: The Brain Behind Modern AI Applications",
    description:
      "Learn how an AI orchestrator routes questions to RAG, code search, web search, and LLM inference—with query rewriting, streaming SSE, observability, and production-ready patterns.",
    publishedAt: "2026-06-01",
    tags: [
      "AI orchestrator",
      "LLM routing",
      "RAG",
      "retrieval augmented generation",
      "SSE streaming",
      "observability",
    ],
    readingTimeMinutes: 12,
  },
];

export function getBlogPost(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function blogPostPath(slug: string): string {
  return `/blog/${slug}`;
}
