/** Shared links and ids for router SFT/DPO train UI and blog article. */

export const ROUTER_TRAIN_REPOS = {
  orchestrator: "https://github.com/taixingbi/layer-orchestrator-v1",
  train: "https://github.com/taixingbi/layer-router-train-v1",
  goldenTest:
    "https://github.com/taixingbi/layer-router-train-v1/tree/main/data/golden-test",
  sftDataset:
    "https://github.com/taixingbi/layer-router-train-v1/tree/main/data/output/sft",
  dpoDataset:
    "https://github.com/taixingbi/layer-router-train-v1/tree/main/data/output/dpo",
  deployWorkflow:
    "https://github.com/taixingbi/layer-router-train-v1/blob/main/.github/workflows/deploy.yml",
  vllmDeploy:
    "https://github.com/taixingbi/huntai-k3s/blob/main/docs/deploy-vllm-inference.md",
} as const;

export const ROUTER_SFT_LORA_ID = "router-qwen2.5-7b-sft-v1.00";
export const ROUTER_DPO_LORA_ID = "router-qwen2.5-7b-dpo-v1.00";

export const ROUTER_DEFAULT_BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct";
export const ROUTER_DEFAULT_PROMPT_VERSION = "router-v2.00";

export const ROUTER_PIPELINE_ASCII = `
golden-test/data/*.csv          (question, expected_route)
        │
        ├─► app.build sft ──► output/sft/train.jsonl + val.jsonl
        │         │
        │         ▼
        │   layer-router-train-v1  (QLoRA SFT)
        │         │
        │         ▼
        │   HF Hub → vLLM LoRA: ${ROUTER_SFT_LORA_ID}
        │
        └─► app.build dpo ──► output/dpo chosen/rejected pairs
                  │
                  ▼
            layer-router-train-v1  (QLoRA DPO)
                  │
                  ▼
            HF Hub → vLLM LoRA: ${ROUTER_DPO_LORA_ID}
        │
        ▼
POST /v1/orchestrator/eval/router  +  python -m app.eval
        │
        ▼
layer-orchestrator-v1 (ROUTER_MODEL env or router_model on eval)
`.trim();
