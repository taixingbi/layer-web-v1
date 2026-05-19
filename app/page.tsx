/**
 * Product landing page: brand, value prop, and auth entry points.
 */

import Link from "next/link";

import { ChatBrand } from "@/components/ChatBrand";

/** Root route: huntAI marketing hub. */
export default function Home() {
  return (
    <div className="landing-page min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="landing-hero w-full max-w-lg flex flex-col items-center text-center gap-8">
        <ChatBrand size="lg" layout="stacked" />

        <div className="space-y-3">
          <p className="landing-tagline text-lg sm:text-xl leading-relaxed text-gray-700 dark:text-gray-200 font-medium">
            Ask questions across resumes, documents, logs, architecture, and AI knowledge
            systems.
          </p>
          <p className="landing-subline text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Powered by RAG, orchestration, and streaming AI infrastructure.
          </p>
        </div>

        <div className="flex flex-col items-stretch sm:items-center gap-3 w-full sm:w-auto pt-2">
          <Link href="/chat" className="landing-btn-primary">
            Start chatting
            <span aria-hidden className="ml-1.5">
              →
            </span>
          </Link>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Link href="/signup" className="landing-btn-secondary">
              Sign up
            </Link>
            <Link href="/login" className="landing-btn-ghost">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
