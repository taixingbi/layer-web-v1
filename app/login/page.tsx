"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AccessTokenSessionForm } from "@/components/AccessTokenSessionForm";
import { DemoEnvLoginForm } from "@/components/DemoEnvLoginForm";

export default function LoginPage() {
  const router = useRouter();
  const [demoEnabled, setDemoEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/config")
      .then((r) => r.json() as Promise<{ demoLogin?: boolean }>)
      .then((j) => {
        if (!cancelled && j.demoLogin) setDemoEnabled(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const finishLogin = useCallback(() => {
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
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Store your gateway access token in an httpOnly cookie for <code className="text-xs">/api/chat</code> and{" "}
            <code className="text-xs">/api/feedback</code>. Use a JWT accepted by your gateway when{" "}
            <code className="text-xs">AUTH_MODE=jwt</code>.
          </p>
        </div>

        <AccessTokenSessionForm submitLabel="Sign in with token" />

        {demoEnabled ? <DemoEnvLoginForm onSuccess={finishLogin} /> : null}

        <p className="text-center text-sm">
          <Link href="/signup" className="text-[#10a37f] hover:underline">
            Create an account
          </Link>
          <span className="text-gray-400"> · </span>
          <Link href="/chat" className="text-[#10a37f] hover:underline">
            Continue without signing in
          </Link>{" "}
          <span className="text-gray-400">(uses server </span>
          <code className="text-xs text-gray-500">GATEWAY_BEARER_TOKEN</code>
          <span className="text-gray-400"> when stub)</span>
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
