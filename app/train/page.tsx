"use client";

import { TrainAccessGate } from "@/components/train/TrainAccessGate";
import { TrainProductCard } from "@/components/train/TrainProductCard";
import { TrainShell } from "@/components/train/TrainShell";
import { TRAIN_PRODUCTS } from "@/lib/train/products";

export default function TrainPage() {
  return (
    <TrainShell
      title="Training"
      subtitle="Fine-tune platform models. Router SFT/DPO is active; more products coming soon."
    >
      <TrainAccessGate>
        <div className="train-product-grid">
          {TRAIN_PRODUCTS.map((product) => (
            <TrainProductCard key={product.id} product={product} />
          ))}
        </div>
      </TrainAccessGate>
    </TrainShell>
  );
}
