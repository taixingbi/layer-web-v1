/**
 * Account registration page (gateway / Supabase signup).
 */

"use client";

import Link from "next/link";

import { EmailPasswordAuthForm } from "@/components/EmailPasswordAuthForm";

/** Sign-up route; may require email confirmation before first sign-in. */
export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white dark:bg-[#0d0d0d] text-[#0d0d0d] dark:text-[#ececec]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Create an account</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Registers via the gateway (Supabase Auth). When email confirmation is enabled, check your inbox before
            signing in.
          </p>
        </div>

        <EmailPasswordAuthForm mode="signup" />

        <p className="text-center text-sm">
          <Link href="/login" className="text-[#10a37f] hover:underline">
            Already have an account? Sign in
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
