"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AccessTokenSessionForm } from "@/components/AccessTokenSessionForm";
import { DemoEnvLoginForm } from "@/components/DemoEnvLoginForm";

export default function SignupPage() {
  const router = useRouter();
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [signupUrl, setSignupUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/config")
      .then((r) => r.json() as Promise<{ demoLogin?: boolean; signupUrl?: string | null }>)
      .then((j) => {
        if (cancelled) return;
        if (j.demoLogin) setDemoEnabled(true);
        setSignupUrl(typeof j.signupUrl === "string" && j.signupUrl.length > 0 ? j.signupUrl : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const finishSignup = useCallback(() => {
    try {
      sessionStorage.removeItem("layer_bearer_token");
    } catch {
      /* ignore */
    }
    router.push("/chat");
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white dark:bg-[#0d0d0d] text-[#0d0d0d] dark:text-[#ececec]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Create an account</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Registration is usually handled by your identity provider (OIDC / OAuth). After your admin or IdP gives you
            access, finish here by saving your <strong>access token</strong> in a secure session cookie (same as sign-in).
          </p>
        </div>

        {signupUrl ? (
          <div className="space-y-2">
            <a
              href={signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full justify-center rounded-lg bg-[#10a37f] text-white py-2.5 text-sm font-medium hover:opacity-90"
            >
              Open registration (new tab)
            </a>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Set <code className="font-mono">AUTH_SIGNUP_URL</code> on the server to your IdP self-service or signup page.
            </p>
          </div>
        ) : (
          <p className="text-sm text-center text-gray-600 dark:text-gray-400 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2">
            Configure <code className="text-xs font-mono">AUTH_SIGNUP_URL</code> to show a &quot;Open registration&quot; button (e.g. Auth0, Okta, or Keycloak signup URL).
          </p>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Have an access token already?</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paste the JWT (or other bearer) your gateway accepts when <code className="font-mono">AUTH_MODE=jwt</code>.
          </p>
          <AccessTokenSessionForm submitLabel="Save token & continue" />
        </div>

        {demoEnabled ? <DemoEnvLoginForm onSuccess={finishSignup} submitLabel="Try demo account" /> : null}

        <p className="text-center text-sm">
          <Link href="/login" className="text-[#10a37f] hover:underline">
            Already have an account? Sign in
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
