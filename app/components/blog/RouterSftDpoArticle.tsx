/**
 * Article body: HuntAI router SFT/DPO training and evaluation.
 */

import Link from "next/link";

import { BlogPre } from "@/components/blog/BlogPre";
import { blogPostPath } from "@/lib/blog-posts";
import {
  ROUTER_DPO_LORA_ID,
  ROUTER_PIPELINE_ASCII,
  ROUTER_SFT_LORA_ID,
  ROUTER_TRAIN_REPOS,
} from "@/lib/train/router-constants";

const REPOS = ROUTER_TRAIN_REPOS;
const SFT_LORA_ID = ROUTER_SFT_LORA_ID;
const DPO_LORA_ID = ROUTER_DPO_LORA_ID;

const CHECKPOINT_DIR_PATTERN = "checkpoints/router-{method}-qwen2.5-*";

export function RouterSftDpoArticle() {
  return (
    <article className="blog-article">
      <header className="blog-article-header">
        <p className="blog-eyebrow">Production engineering · HuntAI platform</p>
        <h1>Training the HuntAI Router: SFT, DPO, and Golden Eval</h1>
        <p className="blog-lede">
          HuntAI&apos;s intent router is a fine-tuned Qwen2.5 model—not a general-purpose chat LLM on
          the hot path. We train it with supervised fine-tuning (SFT), refine it with direct preference
          optimization (DPO), and ship only adapters that pass golden-route evaluation on real
          production prompts.
        </p>
      </header>

      <section>
        <h2>The pipeline at a glance</h2>
        <BlogPre title="From gold labels to production LoRA">{ROUTER_PIPELINE_ASCII}</BlogPre>
      </section>

      <section>
        <h2>Why fine-tune a dedicated router</h2>
        <p>
          A base instruct model can guess routes, but production needs structured JSON on every turn:
          rewritten question, route, confidence, and reason. Fine-tuning on HuntAI gold data teaches
          the model the exact schema and route boundaries used by{" "}
          <code>layer-orchestrator-v1</code>—separate from answer generation, RAG, or GitHub MCP.
        </p>
        <ul className="blog-list-check">
          <li>Predictable JSON output for downstream parsing</li>
          <li>Lower latency than prompting a 7B model with a long rubric every time</li>
          <li>Measurable quality via golden CSVs before rollout</li>
          <li>LoRA adapters on vLLM—swap SFT vs DPO without touching the base weights</li>
        </ul>
      </section>

      <section>
        <h2>SFT vs DPO</h2>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Method</th>
                <th>Data</th>
                <th>Goal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1 — Imitation</td>
                <td>SFT</td>
                <td>Gold completions only</td>
                <td>Learn correct route + rewrite from labeled examples</td>
              </tr>
              <tr>
                <td>2 — Preference</td>
                <td>DPO</td>
                <td>Chosen vs rejected pairs</td>
                <td>Penalize common misroutes seen in eval failures</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Typical workflow: build SFT JSONL, train an SFT LoRA, run golden eval, build DPO pairs from
          mismatches (or synthetic opposites), train DPO on top of the same base, compare match rates.
          Both adapters load side-by-side on vLLM; the orchestrator picks one via{" "}
          <code>router_model</code> or deployment <code>ROUTER_MODEL</code>.
        </p>
      </section>

      <section>
        <h2>Golden datasets</h2>
        <p>
          Source of truth lives in{" "}
          <a href={REPOS.goldenTest} target="_blank" rel="noopener noreferrer">
            data/golden-test/data
          </a>
          :
        </p>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>Suite</th>
                <th>Example routes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>data/tools/router_rag_private_kb.csv</code>
                </td>
                <td>Candidate / profile → <code>rag_private_kb</code></td>
              </tr>
              <tr>
                <td>
                  <code>data/tools/router_github.csv</code>
                </td>
                <td>HuntAI repo architecture → <code>github_search</code></td>
              </tr>
              <tr>
                <td>
                  <code>data/tools/router_web_search.csv</code>
                </td>
                <td>Public docs / news → <code>web_search</code></td>
              </tr>
              <tr>
                <td>
                  <code>data/internal/router_greeting.csv</code>
                </td>
                <td>Small talk → <code>greeting</code> (often seed-short-circuit in prod)</td>
              </tr>
              <tr>
                <td>
                  <code>data/internal/router_reject.csv</code>
                </td>
                <td>Injection guard → <code>reject</code></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          CSV header: <code>question,expected_route</code>. Optional{" "}
          <code>history</code> JSON for multi-turn rewrite tests. Dataset builders skip rows that never
          hit the router LLM in production (seed FAQ, deterministic rules) unless{" "}
          <code>INCLUDE_SEED_FAQ=1</code> is set.
        </p>
      </section>

      <section>
        <h2>SFT JSONL shape</h2>
        <p>
          <a href={REPOS.sftDataset} target="_blank" rel="noopener noreferrer">
            data/output/sft
          </a>{" "}
          emits chat rows that mirror what the router sees at inference time:
        </p>
        <BlogPre title="output/sft/train.jsonl (one line, abbreviated)">
          {`
{
  "messages": [
    {"role": "system", "content": "<router-v2.00.txt rendered>"},
    {"role": "user", "content": "History:\\n(none)\\n\\nLatest question:\\nWhat are the renewal requirements for H4 EAD?"},
    {"role": "assistant", "content": "{\\"rewritten_question\\":\\"...\\",\\"route\\":\\"rag_private_kb\\",\\"confidence\\":0.97,...}"}
  ],
  "meta": {
    "expected_route": "rag_private_kb",
    "router_prompt_version": "router-v2.00",
    "completion_source": "gold"
  }
}
`.trim()}
        </BlogPre>
        <p>Build with:</p>
        <BlogPre>{`python -m app.build sft`}</BlogPre>
      </section>

      <section>
        <h2>DPO JSONL shape</h2>
        <p>
          <a href={REPOS.dpoDataset} target="_blank" rel="noopener noreferrer">
            data/output/dpo
          </a>{" "}
          adds preference pairs—same prompt, better vs worse router JSON:
        </p>
        <BlogPre title="output/dpo/train.jsonl (fields)">
          {`
{
  "prompt": [ system + user messages ],
  "chosen":   "{ ... correct route JSON from gold ... }",
  "rejected": "{ ... wrong route from eval mismatch or synthetic ... }",
  "meta": {
    "rejected_source": "result_csv | live_eval | synthetic",
    "expected_route": "rag",
    "router_prompt_version": "router-v2.00"
  }
}
`.trim()}
        </BlogPre>
        <p>
          Rebuild DPO after a golden eval pass so <strong>rejected</strong> comes from real{" "}
          <code>route_match=false</code> rows in <code>golden-test/result/*.csv</code>, not only
          synthetic opposites:
        </p>
        <BlogPre>{`
ROUTER_PROMPT_VERSION=router-v2.00 python -m app.eval
python -m app.build dpo
`.trim()}
        </BlogPre>
      </section>

      <section>
        <h2>Training on GPU (layer-router-train-v1)</h2>
        <p>
          Training runs offline in{" "}
          <a href={REPOS.train} target="_blank" rel="noopener noreferrer">
            layer-router-train-v1
          </a>{" "}
          — QLoRA with TRL, not as a k3s service:
        </p>
        <BlogPre title="Train commands">
          {`
# SFT
python -m app.train.main --method sft

# DPO (default)
python -m app.train.main --method dpo

# 7B base + versioned Hub repo
BASE_MODEL=Qwen/Qwen2.5-7B-Instruct HF_REPO_VERSION=1.00 TRAIN_METHOD=sft python -m app.train.main
`.trim()}
        </BlogPre>
        <p>
          JSONL is fetched into <code>./data/sft/</code> or <code>./data/dpo/</code> on first run.
          Checkpoints land under <code>{CHECKPOINT_DIR_PATTERN}</code>; CI can push to
          Hugging Face Hub for vLLM to load as LoRA modules.
        </p>
      </section>

      <section>
        <h2>Deploy LoRA on vLLM</h2>
        <p>
          After Hub upload, huntai-k3s registers static LoRA ids on the inference fleet (
          <a href={REPOS.vllmDeploy} target="_blank" rel="noopener noreferrer">
            deploy-vllm-inference.md
          </a>
          ):
        </p>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>vLLM LoRA id</th>
                <th>Hugging Face repo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>{SFT_LORA_ID}</code>
                </td>
                <td>taixingbi/router-qwen2.5-7b-sft-v1.00</td>
              </tr>
              <tr>
                <td>
                  <code>{DPO_LORA_ID}</code>
                </td>
                <td>taixingbi/router-qwen2.5-7b-dpo-v1.00</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Production chat keeps the base <code>Qwen/Qwen2.5-7B-Instruct</code> model for answers; only
          eval and router calls set <code>router_model</code> to an adapter id.
        </p>
      </section>

      <section>
        <h2>Evaluating before rollout</h2>
        <p>
          Single-request smoke against the orchestrator eval endpoint:
        </p>
        <BlogPre title="Eval one question (SFT adapter)">
          {`
POST /v1/orchestrator/eval/router
{
  "question": "What are the renewal requirements for H4 EAD?",
  "expected_route": "rag",
  "router_model": "router-qwen2.5-7b-sft-v1.00",
  "router_prompt_version": "router-v2.00",
  "router_temperature": 0
}
`.trim()}
        </BlogPre>
        <BlogPre title="Golden batch result">
          {`
Question:         What are the renewal requirements for H4 EAD?
Expected route:   rag_private_kb
Predicted route:  rag_private_kb
Result:           PASS (route_match: true)
`.trim()}
        </BlogPre>
        <p>Full suite with separate result dirs per adapter:</p>
        <BlogPre>{`
ROUTER_MODEL=router-qwen2.5-7b-sft-v1.00 \\
  python -m app.eval \\
  --result-dir data/golden-test/result/sft-v1.00

ROUTER_MODEL=router-qwen2.5-7b-dpo-v1.00 \\
  python -m app.eval \\
  --result-dir data/golden-test/result/dpo-v1.00
`.trim()}
        </BlogPre>
        <p>
          The script writes per-file match rates and{" "}
          <code>router-eval-report-&lt;prompt&gt;-&lt;model&gt;.md</code> listing every{" "}
          <code>route_match=false</code> row—bad items to fix in the next DPO build.
        </p>
      </section>

      <section>
        <h2>Production router output</h2>
        <p>At inference, the fine-tuned router still returns the same envelope the orchestrator expects:</p>
        <BlogPre title="Router decision JSON">
          {`
{
  "rewritten_question": "What are the renewal requirements for H4 EAD?",
  "route": "rag_private_kb",
  "confidence": 0.97,
  "static_answer": null,
  "reason": "Private knowledge base retrieval required"
}
`.trim()}
        </BlogPre>
        <p>
          Prompt version in manifests (e.g. <code>ROUTER_PROMPT_VERSION=router-v2.00</code>) must match
          the version used to build JSONL and run golden eval—otherwise train/serve skew shows up as
          silent accuracy drops.
        </p>
      </section>

      <section>
        <h2>Related reading</h2>
        <ul className="blog-link-list">
          <li>
            <Link href={blogPostPath("building-an-ai-orchestrator")} className="blog-inline-link">
              From Prompt to Response: Inside HuntAI&apos;s Orchestrator
            </Link>
            {" — routing, SSE, eval endpoint"}
          </li>
          <li>
            <Link href={blogPostPath("layer-gateway-inference-design")} className="blog-inline-link">
              GPU-Aware Inference Routing: Inside layer-gateway-inference-v1
            </Link>
            {" — vLLM fleet that hosts router LoRAs"}
          </li>
          <li>
            <Link href={blogPostPath("layer-rag-query-design")} className="blog-inline-link">
              Hybrid RAG in Production: Inside layer-rag-query-v1
            </Link>
            {" — where rag_private_kb requests land"}
          </li>
        </ul>
      </section>

      <section>
        <h2>Repositories</h2>
        <ul className="blog-link-list">
          <li>
            <a href={REPOS.orchestrator} target="_blank" rel="noopener noreferrer">
              layer-orchestrator-v1
            </a>
            {" — router-eval, prompts, eval API"}
          </li>
          <li>
            <a href={REPOS.train} target="_blank" rel="noopener noreferrer">
              layer-router-train-v1
            </a>
            {" — QLoRA SFT/DPO training CLI"}
          </li>
        </ul>
      </section>

      <section>
        <h2>Closing</h2>
        <p>
          Shipping a production router is a loop: label gold → train SFT → eval → build DPO from
          failures → eval again → pin LoRA on vLLM. HuntAI treats routing as a measurable subsystem—not
          a one-shot prompt tweak.
        </p>
        <p className="blog-closing">Label routes. Train adapters. Fail golden tests before users do.</p>
      </section>
    </article>
  );
}
