/**
 * Blog post registry for index pages, sitemap, and shared metadata.
 */

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  tags: string[];
  readingTimeMinutes: number;
};

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "gpu-llm-serving-kubernetes",
    title: "Building a Production-Ready GPU LLM Serving Platform on Kubernetes",
    description:
      "EKS, Karpenter, vLLM, Prometheus, and KEDA — queue-first autoscaling signals, production hardening, and a Terraform reference repo for Qwen on G5.",
    publishedAt: "2026-06-17",
    updatedAt: "2026-06-17",
    tags: ["EKS", "vLLM", "Karpenter", "KEDA", "GPU inference", "Prometheus"],
    readingTimeMinutes: 10,
  },
  {
    slug: "building-an-ai-orchestrator",
    title: "From Prompt to Response: Inside HuntAI's Orchestrator",
    description:
      "How HuntAI routes requests across layer-orchestrator-v1, RAG, GitHub MCP, and vLLM—with real SSE events, router golden tests, nested latency, and k3s GitOps deployment.",
    publishedAt: "2026-06-01",
    updatedAt: "2026-06-01",
    tags: [
      "HuntAI",
      "AI orchestrator",
      "production RAG",
      "router evaluation",
      "SSE streaming",
      "observability",
      "k3s GitOps",
    ],
    readingTimeMinutes: 14,
  },
  {
    slug: "layer-gateway-inference-design",
    title: "GPU-Aware Inference Routing: Inside layer-gateway-inference-v1",
    description:
      "How HuntAI schedules chat completions across multiple vLLM GPU backends—with load-aware scoring, admission queues, circuit breakers, Prometheus metrics, and k3s GitOps deployment.",
    publishedAt: "2026-06-01",
    updatedAt: "2026-06-01",
    tags: [
      "HuntAI",
      "inference gateway",
      "vLLM",
      "GPU routing",
      "load balancing",
      "Prometheus",
      "k3s",
    ],
    readingTimeMinutes: 11,
  },
  {
    slug: "router-sft-dpo-training",
    title: "Training the HuntAI Router: SFT, DPO, and Golden Eval",
    description:
      "How HuntAI builds router training data from golden CSVs, runs QLoRA SFT and DPO in layer-router-train-v1, loads LoRA adapters on vLLM, and gates rollout with batch route-match eval.",
    publishedAt: "2026-06-01",
    updatedAt: "2026-06-01",
    tags: [
      "HuntAI",
      "router fine-tuning",
      "SFT",
      "DPO",
      "QLoRA",
      "golden test",
      "Qwen2.5",
    ],
    readingTimeMinutes: 12,
  },
  {
    slug: "layer-rag-query-design",
    title: "Hybrid RAG in Production: Inside layer-rag-query-v1",
    description:
      "How HuntAI runs hybrid dense+BM25+RRF retrieval, Qdrant ACL filters, reranking, cited answers, and SSE streaming in layer-rag-query-v1—with orchestrator integration and k3s deployment.",
    publishedAt: "2026-06-01",
    updatedAt: "2026-06-01",
    tags: [
      "HuntAI",
      "RAG",
      "hybrid retrieval",
      "Qdrant",
      "reranking",
      "SSE streaming",
      "access control",
    ],
    readingTimeMinutes: 11,
  },
  {
    slug: "role-based-access-control",
    title: "From Login to Retrieval: Role-Based Access in HuntAI",
    description:
      "How HuntAI authenticates at layer-gateway-api-v1, forwards X-User-* headers through the orchestrator, tags chunks at ingest, and enforces Qdrant ACL filters in layer-rag-query-v1.",
    publishedAt: "2026-06-02",
    updatedAt: "2026-06-02",
    tags: [
      "HuntAI",
      "RBAC",
      "access control",
      "Supabase auth",
      "RAG security",
      "Qdrant",
      "gateway",
    ],
    readingTimeMinutes: 12,
  },
  {
    slug: "grafana-observability",
    title: "Observability with Grafana Cloud: Metrics, Logs, and Dashboards",
    description:
      "How HuntAI ships Prometheus metrics and Loki logs to Grafana Cloud—with Alloy, remote_write, workload labels, imported dashboards, and trace_id debugging from the web UI.",
    publishedAt: "2026-06-01",
    updatedAt: "2026-06-01",
    tags: [
      "HuntAI",
      "Grafana Cloud",
      "Prometheus",
      "Loki",
      "Alloy",
      "observability",
      "k3s",
    ],
    readingTimeMinutes: 10,
  },
];

export function getBlogPost(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function blogPostPath(slug: string): string {
  return `/blog/${slug}`;
}
