"use client";

import { use } from "react";

import { AdminArgoCdDetailPage } from "@/components/admin/AdminArgoCdDetailPage";

type Props = { params: Promise<{ name: string }> };

export default function ArgoCdAppPage({ params }: Props) {
  const { name } = use(params);
  return <AdminArgoCdDetailPage appName={decodeURIComponent(name)} />;
}
