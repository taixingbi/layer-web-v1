/**
 * SEO article: EKS + vLLM + Karpenter + KEDA reference architecture (public, indexable).
 */

import { EksVllmPlatformArticle } from "@/components/blog/EksVllmPlatformArticle";
import { BlogPostPage } from "@/components/blog/BlogPostPage";
import { buildBlogMetadata } from "@/lib/blog-metadata";

const SLUG = "gpu-llm-serving-kubernetes";

export const metadata = buildBlogMetadata(SLUG);

export default function GpuLlmServingKubernetesPage() {
  return (
    <BlogPostPage slug={SLUG} breadcrumbLabel="GPU LLM Platform">
      <EksVllmPlatformArticle />
    </BlogPostPage>
  );
}
