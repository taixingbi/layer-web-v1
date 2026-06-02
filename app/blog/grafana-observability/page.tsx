/**
 * SEO article: HuntAI Grafana Cloud observability (public, indexable).
 */

import { BlogPostPage } from "@/components/blog/BlogPostPage";
import { GrafanaObservabilityArticle } from "@/components/blog/GrafanaObservabilityArticle";
import { buildBlogMetadata } from "@/lib/blog-metadata";

const SLUG = "grafana-observability";

export const metadata = buildBlogMetadata(SLUG);

export default function GrafanaObservabilityPage() {
  return (
    <BlogPostPage slug={SLUG} breadcrumbLabel="Grafana Observability">
      <GrafanaObservabilityArticle />
    </BlogPostPage>
  );
}
