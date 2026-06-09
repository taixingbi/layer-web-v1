/** Registry of trainable platform components (extensible). */

export type TrainMethod = "sft" | "dpo";

export type TrainProductStatus = "active" | "planned";

export type TrainProduct = {
  id: string;
  label: string;
  description: string;
  href: string;
  methods: TrainMethod[];
  status: TrainProductStatus;
  repoUrl: string;
};

export const TRAIN_PRODUCTS: TrainProduct[] = [
  {
    id: "router",
    label: "Intent Router",
    description:
      "QLoRA SFT and DPO on golden CSVs. Build JSONL, train on GPU, publish LoRA to Hub, gate with golden eval.",
    href: "/train/router",
    methods: ["sft", "dpo"],
    status: "active",
    repoUrl: "https://github.com/taixingbi/layer-router-train-v1",
  },
  {
    id: "rag-answer",
    label: "RAG Answer",
    description: "Fine-tune the cited answer model on retrieval-grounded completions.",
    href: "/train/rag-answer",
    methods: ["sft"],
    status: "planned",
    repoUrl: "",
  },
  {
    id: "github-tool",
    label: "GitHub Tool",
    description: "Train or align the GitHub MCP tool-calling model.",
    href: "/train/github-tool",
    methods: ["sft"],
    status: "planned",
    repoUrl: "",
  },
];

export function getTrainProduct(id: string): TrainProduct | undefined {
  return TRAIN_PRODUCTS.find((p) => p.id === id);
}
