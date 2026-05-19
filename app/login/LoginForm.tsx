/**
 * Client login form wrapper that reads ``?next=`` from the URL.
 */

"use client";

import { useSearchParams } from "next/navigation";

import { EmailPasswordAuthForm } from "@/components/EmailPasswordAuthForm";

/** Renders {@link EmailPasswordAuthForm} in login mode with post-auth redirect from search params. */
export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.trim();
  const redirectAfterAuth = next && next.startsWith("/") ? next : "/chat";
  return <EmailPasswordAuthForm mode="login" redirectAfterAuth={redirectAfterAuth} />;
}
