/**
 * SEO article: HuntAI router SFT/DPO training (public, indexable).
 */

import { BlogPostPage } from "@/components/blog/BlogPostPage";
import { RouterSftDpoArticle } from "@/components/blog/RouterSftDpoArticle";
import { buildBlogMetadata } from "@/lib/blog-metadata";

const SLUG = "router-sft-dpo-training";

export const metadata = buildBlogMetadata(SLUG);

export default function RouterSftDpoTrainingPage() {
  return (
    <BlogPostPage slug={SLUG} breadcrumbLabel="Router SFT / DPO">
      <RouterSftDpoArticle />
    </BlogPostPage>
  );
}
