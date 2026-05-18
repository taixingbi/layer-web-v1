import type { Metadata } from "next";

import { RecoveryHashRedirect } from "@/components/RecoveryHashRedirect";
import "./globals.css";

export const metadata: Metadata = {
  title: "huntAI",
  description: "huntAI",
};

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
