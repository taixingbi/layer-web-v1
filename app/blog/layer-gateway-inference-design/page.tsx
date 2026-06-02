/**
 * SEO article: layer-gateway-inference-v1 design (public, indexable).
 */

import { InferenceGatewayArticle } from "@/components/blog/InferenceGatewayArticle";
import { BlogPostPage } from "@/components/blog/BlogPostPage";
import { buildBlogMetadata } from "@/lib/blog-metadata";

const SLUG = "layer-gateway-inference-design";

export const metadata = buildBlogMetadata(SLUG);

export default function InferenceGatewayDesignPage() {
  return (
    <BlogPostPage slug={SLUG} breadcrumbLabel="Inference Gateway">
      <InferenceGatewayArticle />
    </BlogPostPage>
  );
}
