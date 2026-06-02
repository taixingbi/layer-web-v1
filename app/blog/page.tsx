/**
 * Blog index: lists published articles for discovery and SEO internal linking.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { BLOG_POSTS, blogPostPath } from "@/lib/blog-posts";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides on AI orchestrators, LLM routing, RAG, streaming, and production observability from the HuntAI team.",
  openGraph: {
    title: "HuntAI Blog",
    description:
      "Guides on AI orchestrators, LLM routing, RAG, streaming, and production observability.",
    url: `${getSiteUrl()}/blog`,
  },
  alternates: {
    canonical: `${getSiteUrl()}/blog`,
  },
};

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return (
    <div className="blog-index">
      <header className="blog-index-header">
        <h1>HuntAI Blog</h1>
        <p>
          Deep dives on AI orchestration, retrieval, routing models, and shipping reliable LLM
          products to production.
        </p>
      </header>
      <ul className="blog-index-list">
        {posts.map((post) => (
          <li key={post.slug} className="blog-index-card">
            <Link href={blogPostPath(post.slug)} className="blog-index-card-link">
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <div className="blog-index-meta">
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                <span aria-hidden="true">·</span>
                <span>{post.readingTimeMinutes} min read</span>
              </div>
              <ul className="blog-tag-list" aria-label="Topics">
                {post.tags.slice(0, 4).map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
