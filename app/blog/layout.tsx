/**
 * Blog section layout: shared chrome and default metadata for public articles.
 */

import type { Metadata } from "next";

import { BlogShell } from "@/components/blog/BlogShell";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: {
    default: "Blog",
    template: "%s | HuntAI Blog",
  },
  description:
    "Architecture guides and production lessons for building AI orchestrators, RAG systems, and LLM platforms.",
  openGraph: {
    type: "website",
    siteName: "HuntAI",
    locale: "en_US",
  },
  alternates: {
    canonical: `${getSiteUrl()}/blog`,
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <BlogShell>{children}</BlogShell>;
}
