"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ChatBrand } from "@/components/ChatBrand";

type Props = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/argocd", label: "ArgoCD" },
  { href: "/admin/logs", label: "Logs" },
];

function navActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children, title, subtitle, actions }: Props) {
  const pathname = usePathname();

  return (
    <div className="admin-page min-h-screen">
      <header className="admin-header">
        <div className="admin-header-inner">
          <ChatBrand size="sm" layout="row" />
          <span className="admin-header-title">Platform</span>
          <nav className="admin-header-nav">
            <Link href="/chat" className="admin-nav-link">
              Chat
            </Link>
            <span className="admin-nav-link admin-nav-link--active" aria-current="page">
              Admin
            </span>
            <Link href="/train" className="admin-nav-link">
              Train
            </Link>
          </nav>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-subnav">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-subnav-link${
                navActive(pathname, item.href, item.exact) ? " admin-subnav-link--active" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="admin-toolbar">
          <div>
            <h1 className="admin-title">{title}</h1>
            {subtitle ? <p className="admin-subtitle">{subtitle}</p> : null}
          </div>
          {actions}
        </div>

        {children}
      </main>
    </div>
  );
}

export function AdminGate({
  loading,
  forbidden,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  forbidden: boolean;
  error: string | null;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading) {
    return <p className="admin-muted">Loading…</p>;
  }
  if (forbidden) {
    return (
      <div className="admin-alert">
        <h2 className="admin-alert-title">Admin access required</h2>
        <p className="admin-muted">Your account does not have the admin role.</p>
        <Link href="/chat" className="admin-btn-secondary">
          Back to chat
        </Link>
      </div>
    );
  }
  if (error) {
    return (
      <div className="admin-alert">
        <h2 className="admin-alert-title">Unable to load</h2>
        <p className="admin-muted">{error}</p>
        {error === "Sign in required" ? (
          <Link href="/login" className="admin-btn-secondary">
            Sign in
          </Link>
        ) : (
          <button type="button" className="admin-btn-secondary" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
