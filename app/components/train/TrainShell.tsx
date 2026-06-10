"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PlatformSubnav } from "@/components/admin/PlatformSubnav";
import { ChatBrand } from "@/components/ChatBrand";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function TrainShell({ children, title, subtitle }: Props) {
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
          </nav>
        </div>
      </header>

      <main className="admin-main">
        <PlatformSubnav />
        {title ? (
          <div className="admin-toolbar">
            <div>
              <h1 className="admin-title">{title}</h1>
              {subtitle ? <p className="admin-subtitle">{subtitle}</p> : null}
            </div>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
