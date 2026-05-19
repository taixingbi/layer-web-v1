/**
 * Root HTML shell: global styles, metadata, and Supabase recovery hash redirect.
 */

import type { Metadata } from "next";

import { RecoveryHashRedirect } from "@/components/RecoveryHashRedirect";
import "./globals.css";

/** Default document metadata for all routes. */
export const metadata: Metadata = {
  title: "huntAI",
  description: "huntAI",
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
