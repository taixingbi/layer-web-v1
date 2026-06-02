/**
 * Shared SEO metadata helpers for blog article routes.
 */

import type { Metadata } from "next";

import { getBlogPost } from "@/lib/blog-posts";
import { getSiteUrl } from "@/lib/site-url";

export function blogCanonicalUrl(slug: string): string {
  return `${getSiteUrl()}/blog/${slug}`;
}

export function buildBlogMetadata(slug: string): Metadata {
  const post = getBlogPost(slug);
  if (!post) {
    return { title: "Blog | HuntAI" };
  }
  const canonicalUrl = blogCanonicalUrl(slug);
  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    authors: [{ name: "HuntAI Team", url: getSiteUrl() }],
    category: "Technology",
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: canonicalUrl,
      publishedTime: post.publishedAt,
      tags: post.tags,
      siteName: "HuntAI",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export function buildArticleJsonLd(slug: string): Record<string, unknown> {
  const post = getBlogPost(slug);
  if (!post) return {};
  const canonicalUrl = blogCanonicalUrl(slug);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Organization",
      name: "HuntAI",
      url: getSiteUrl(),
    },
    publisher: {
      "@type": "Organization",
      name: "HuntAI",
      url: getSiteUrl(),
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    keywords: post.tags.join(", "),
    articleSection: "AI Architecture",
    inLanguage: "en-US",
  };
}
