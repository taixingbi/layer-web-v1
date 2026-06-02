/**
 * Root HTML shell: global styles, metadata, and Supabase recovery hash redirect.
 */

import type { Metadata } from "next";

import { RecoveryHashRedirect } from "@/components/RecoveryHashRedirect";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

/** Default document metadata for all routes. */
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "HuntAI — Intelligent AI Assistant",
    template: "%s | HuntAI",
  },
  description:
    "HuntAI routes your questions through RAG, code search, and web retrieval with a production AI orchestrator.",
  openGraph: {
    siteName: "HuntAI",
    locale: "en_US",
    type: "website",
  },
};

/** Wraps all pages with document structure and client-side hash recovery routing. */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <RecoveryHashRedirect />
        {children}
      </body>
    </html>
  );
}
