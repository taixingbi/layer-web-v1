import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Training",
  robots: { index: false, follow: false },
};

export default function TrainLayout({ children }: { children: React.ReactNode }) {
  return children;
}
