/**
 * Product landing page: brand, value prop, and auth entry points.
 */

import Link from "next/link";

import { ChatBrand } from "@/components/ChatBrand";

/** Root route: HuntAI marketing hub. */
export default function Home() {
  return (
    <div className="landing-page min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="landing-hero w-full max-w-lg flex flex-col items-center text-center gap-8">
        <ChatBrand size="lg" layout="stacked" />

        <div className="flex flex-col items-stretch sm:items-center gap-3 w-full sm:w-auto pt-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Link href="/signup" className="landing-btn-secondary">
              Sign up
            </Link>
            <Link href="/login" className="landing-btn-ghost">
              Sign in
            </Link>
          </div>
          <Link href="/blog/building-an-ai-orchestrator" className="landing-blog-link">
            Read: Building an AI Orchestrator →
          </Link>
        </div>
      </div>
    </div>
  );
}
