/**
 * Shared blog layout shell: header navigation and article container.
 */

import Link from "next/link";

import { ChatBrand } from "@/components/ChatBrand";

type Props = {
  children: React.ReactNode;
};

export function BlogShell({ children }: Props) {
  return (
    <div className="blog-page min-h-screen">
      <header className="blog-header">
        <div className="blog-header-inner">
          <Link href="/chat" className="blog-brand-link" aria-label="HuntAI chat">
            <ChatBrand size="sm" layout="row" />
          </Link>
          <nav className="blog-nav" aria-label="Blog navigation">
            <Link href="/blog" className="blog-nav-link">
              Blog
            </Link>
          </nav>
        </div>
      </header>
      <main className="blog-main">{children}</main>
      <footer className="blog-footer">
        <p>
          <Link href="/chat" className="blog-footer-link">
            Chat
          </Link>
          {" · "}
          <Link href="/blog" className="blog-footer-link">
            Blog
          </Link>
        </p>
      </footer>
    </div>
  );
}
