/**
 * SEO article: HuntAI RBAC from auth to RAG retrieval (public, indexable).
 */

import { BlogPostPage } from "@/components/blog/BlogPostPage";
import { RbacAccessArticle } from "@/components/blog/RbacAccessArticle";
import { buildBlogMetadata } from "@/lib/blog-metadata";

const SLUG = "role-based-access-control";

export const metadata = buildBlogMetadata(SLUG);

export default function RoleBasedAccessControlPage() {
  return (
    <BlogPostPage slug={SLUG} breadcrumbLabel="RBAC">
      <RbacAccessArticle />
    </BlogPostPage>
  );
}
