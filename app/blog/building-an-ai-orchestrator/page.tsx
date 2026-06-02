/**
 * SEO article: Building an AI Orchestrator (public, indexable landing content).
 */

import { BuildingAiOrchestratorArticle } from "@/components/blog/BuildingAiOrchestratorArticle";
import { BlogPostPage } from "@/components/blog/BlogPostPage";
import { buildBlogMetadata } from "@/lib/blog-metadata";

const SLUG = "building-an-ai-orchestrator";

export const metadata = buildBlogMetadata(SLUG);

export default function BuildingAiOrchestratorPage() {
  return (
    <BlogPostPage slug={SLUG} breadcrumbLabel="HuntAI Orchestrator">
      <BuildingAiOrchestratorArticle />
    </BlogPostPage>
  );
}
