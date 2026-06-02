/**
 * SEO article: Building an AI Orchestrator (public, indexable landing content).
 */

import type { Metadata } from "next";
import Link from "next/link";

import { BuildingAiOrchestratorArticle } from "@/components/blog/BuildingAiOrchestratorArticle";
import { getBlogPost } from "@/lib/blog-posts";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "building-an-ai-orchestrator";
const post = getBlogPost(SLUG)!;
const canonicalUrl = `${getSiteUrl()}/blog/${SLUG}`;

export const metadata: Metadata = {
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

function articleJsonLd() {
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

export default function BuildingAiOrchestratorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd()) }}
      />
      <div className="blog-post-wrap">
        <nav className="blog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/blog">Blog</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">HuntAI Orchestrator</span>
        </nav>
        <BuildingAiOrchestratorArticle />
        <aside className="blog-post-cta">
          <h2>Try HuntAI</h2>
          <p>
            Experience intelligent routing, RAG, and streaming answers in a production AI assistant.
          </p>
          <Link href="/signup" className="landing-btn-primary">
            Get started free
          </Link>
        </aside>
      </div>
    </>
  );
}
