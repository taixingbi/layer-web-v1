"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { RouterTrainPanel } from "@/components/train/RouterTrainPanel";
import { TrainAccessGate } from "@/components/train/TrainAccessGate";
import { TrainShell } from "@/components/train/TrainShell";
import type { TrainMethod } from "@/lib/train/products";

function parseMethod(raw: string | null): TrainMethod {
  return raw === "dpo" ? "dpo" : "sft";
}

function RouterTrainContent() {
  const searchParams = useSearchParams();
  const method = parseMethod(searchParams.get("method"));

  return (
    <TrainShell
      title="Intent Router"
      subtitle="QLoRA supervised fine-tuning and direct preference optimization on golden CSVs."
    >
      <TrainAccessGate>
        <p className="admin-muted train-breadcrumb">
          <Link href="/train">Training</Link>
          <span aria-hidden> / </span>
          <span>Router</span>
        </p>
        <RouterTrainPanel method={method} />
      </TrainAccessGate>
    </TrainShell>
  );
}

export default function RouterTrainPage() {
  return (
    <Suspense fallback={<p className="admin-muted p-6">Loading…</p>}>
      <RouterTrainContent />
    </Suspense>
  );
}
