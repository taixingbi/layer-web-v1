"use client";

import Link from "next/link";

import type { TrainMethod } from "@/lib/train/products";

const METHODS: { id: TrainMethod; label: string }[] = [
  { id: "sft", label: "SFT" },
  { id: "dpo", label: "DPO" },
];

type Props = {
  active: TrainMethod;
};

export function RouterMethodTabs({ active }: Props) {
  return (
    <div className="train-method-tabs" role="tablist" aria-label="Training method">
      {METHODS.map((m) => (
        <Link
          key={m.id}
          href={`/train/router?method=${m.id}`}
          role="tab"
          aria-selected={active === m.id}
          className={`train-method-tab${active === m.id ? " train-method-tab--active" : ""}`}
        >
          {m.label}
        </Link>
      ))}
    </div>
  );
}
