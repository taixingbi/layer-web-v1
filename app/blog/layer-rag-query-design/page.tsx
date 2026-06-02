/**
 * SEO article: layer-rag-query-v1 hybrid RAG design (public, indexable).
 */

import { BlogPostPage } from "@/components/blog/BlogPostPage";
import { RagQueryArticle } from "@/components/blog/RagQueryArticle";
import { buildBlogMetadata } from "@/lib/blog-metadata";

const SLUG = "layer-rag-query-design";

export const metadata = buildBlogMetadata(SLUG);

export default function RagQueryDesignPage() {
  return (
    <BlogPostPage slug={SLUG} breadcrumbLabel="RAG Query">
      <RagQueryArticle />
    </BlogPostPage>
  );
}
