import Link from "next/link";

import type { TrainProduct } from "@/lib/train/products";

type Props = {
  product: TrainProduct;
};

export function TrainProductCard({ product }: Props) {
  const isPlanned = product.status === "planned";

  return (
    <article className={`train-product-card${isPlanned ? " train-product-card--planned" : ""}`}>
      <div className="train-product-card-head">
        <h2 className="train-product-card-title">{product.label}</h2>
        <span className={`admin-tag${isPlanned ? " admin-tag--unconfigured" : " admin-tag--ok"}`}>
          {isPlanned ? "planned" : "active"}
        </span>
      </div>
      <p className="admin-muted">{product.description}</p>
      <div className="train-product-card-meta">
        <span className="train-product-methods">
          {product.methods.map((m) => m.toUpperCase()).join(" · ")}
        </span>
      </div>
      <div className="train-product-card-actions">
        {isPlanned ? (
          <span className="admin-muted train-product-card-disabled">Coming soon</span>
        ) : (
          <Link href={product.href} className="admin-btn-secondary">
            Open
          </Link>
        )}
        {product.repoUrl ? (
          <a
            href={product.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="train-product-card-link"
          >
            Repo ↗
          </a>
        ) : null}
      </div>
    </article>
  );
}
