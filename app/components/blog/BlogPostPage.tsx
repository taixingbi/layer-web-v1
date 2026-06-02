/**
 * Shared blog article page shell: JSON-LD, breadcrumb, CTA.
 */

import Link from "next/link";

import { buildArticleJsonLd } from "@/lib/blog-metadata";

type Props = {
  slug: string;
  breadcrumbLabel: string;
  children: React.ReactNode;
};

export function BlogPostPage({ slug, breadcrumbLabel, children }: Props) {
  const jsonLd = buildArticleJsonLd(slug);

  return (
    <>
      {Object.keys(jsonLd).length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <div className="blog-post-wrap">
        <nav className="blog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/blog">Blog</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{breadcrumbLabel}</span>
        </nav>
        {children}
        <aside className="blog-post-cta">
          <h2>Try HuntAI</h2>
          <p>
            Experience intelligent routing, RAG, and streaming answers backed by a production
            inference gateway.
          </p>
          <Link href="/signup" className="landing-btn-primary">
            Get started free
          </Link>
        </aside>
      </div>
    </>
  );
}
