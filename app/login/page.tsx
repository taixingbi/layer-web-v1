/**
 * Sign-in page: email/username + password via BFF session cookies.
 */

"use client";

import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

/** Login route with optional ``?next=`` redirect after success. */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white dark:bg-[#0d0d0d] text-[#0d0d0d] dark:text-[#ececec]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Sign in with email or username. Your session is stored in httpOnly cookies
            for <code className="text-xs">/api/chat</code> and <code className="text-xs">/api/feedback</code>.
          </p>
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
          <Link href="/" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
