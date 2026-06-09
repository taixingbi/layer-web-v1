"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ChatBrand } from "@/components/ChatBrand";

type NavKey = "train" | "admin" | "chat";

type Props = {
  children: ReactNode;
  activeNav?: NavKey;
  title?: string;
  subtitle?: string;
};

export function TrainShell({ children, activeNav = "train", title, subtitle }: Props) {
  return (
    <div className="admin-page min-h-screen">
      <header className="admin-header">
        <div className="admin-header-inner">
          <ChatBrand size="sm" layout="row" />
          <span className="admin-header-title">Platform</span>
          <nav className="admin-header-nav">
            <Link
              href="/chat"
              className={`admin-nav-link${activeNav === "chat" ? " admin-nav-link--active" : ""}`}
              aria-current={activeNav === "chat" ? "page" : undefined}
            >
              Chat
            </Link>
            <Link
              href="/admin"
              className={`admin-nav-link${activeNav === "admin" ? " admin-nav-link--active" : ""}`}
              aria-current={activeNav === "admin" ? "page" : undefined}
            >
              Admin
            </Link>
            <Link
              href="/train"
              className={`admin-nav-link${activeNav === "train" ? " admin-nav-link--active" : ""}`}
              aria-current={activeNav === "train" ? "page" : undefined}
            >
              Train
            </Link>
          </nav>
        </div>
      </header>

      <main className="admin-main">
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
