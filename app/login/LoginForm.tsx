"use client";

import { useSearchParams } from "next/navigation";

import { EmailPasswordAuthForm } from "@/components/EmailPasswordAuthForm";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.trim();
  const redirectAfterAuth = next && next.startsWith("/") ? next : "/chat";
  return <EmailPasswordAuthForm mode="login" redirectAfterAuth={redirectAfterAuth} />;
}
