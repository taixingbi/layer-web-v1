"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useAdminGate } from "@/lib/train/use-admin-gate";

type Props = {
  children: ReactNode;
};

export function TrainAccessGate({ children }: Props) {
  const { state, error, retry } = useAdminGate();

  if (state === "loading") {
    return <p className="admin-muted">Checking access…</p>;
  }

  if (state === "forbidden") {
    return (
      <div className="admin-alert">
        <h1 className="admin-alert-title">Admin access required</h1>
        <p className="admin-muted">Training tools are limited to admin accounts.</p>
        <Link href="/chat" className="admin-btn-secondary">
          Back to chat
        </Link>
      </div>
    );
  }

  if (state === "signed_out") {
    return (
      <div className="admin-alert">
        <h1 className="admin-alert-title">Sign in required</h1>
        <p className="admin-muted">{error ?? "Sign in to open training tools."}</p>
        <Link href="/login?next=/train" className="admin-btn-secondary">
          Sign in
        </Link>
        {error ? (
          <button type="button" className="admin-btn-secondary" onClick={() => void retry()}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}
