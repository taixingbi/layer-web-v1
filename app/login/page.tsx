/**
 * Sign-in page: email/username + password via BFF session cookies.
 */

"use client";

import Link from "next/link";
import { Suspense } from "react";

import { ChatBrand } from "@/components/ChatBrand";

import { LoginForm } from "./LoginForm";

/** Login route with optional ``?next=`` redirect after success. */
export default function LoginPage() {
  return (
    <div className="auth-page min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white dark:bg-[#0d0d0d] text-[#0d0d0d] dark:text-[#ececec]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <ChatBrand size="md" layout="stacked" className="justify-center" />
        </div>

        <Suspense fallback={<p className="text-center text-sm text-gray-500">Loading…</p>}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-sm">
          <Link href="/signup" className="text-[#10a37f] hover:underline">
            Create an account
          </Link>
        </p>
        <p className="text-center text-sm">
          <Link href="/chat" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back to chat
          </Link>
        </p>
      </div>
    </div>
  );
}
