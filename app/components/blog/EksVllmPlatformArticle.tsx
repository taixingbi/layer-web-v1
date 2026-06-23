/**
 * Article body: standalone EKS + vLLM + Karpenter + KEDA reference architecture.
 */

import Link from "next/link";

import { BlogPre } from "@/components/blog/BlogPre";
import { blogPostPath } from "@/lib/blog-posts";

const REPOS = {
  eksVllm: "https://github.com/taixingbi/eks-vllm",
  terraformProd:
    "https://github.com/taixingbi/eks-vllm/tree/main/terraform/environments/prod",
  kedaScaledObject:
    "https://github.com/taixingbi/eks-vllm/tree/main/kubernetes/vllm",
  monitoring:
    "https://github.com/taixingbi/eks-vllm/tree/main/kubernetes/monitoring",
  karpenter: "https://github.com/taixingbi/eks-vllm/tree/main/kubernetes/karpenter",
} as const;

const QUEUE_DEPTH_PROMQL = "sum(vllm:num_requests_waiting)";
const GPU_CACHE_PROMQL = "max(vllm:gpu_cache_usage_perc)";
const TTFT_PROMQL = `histogram_quantile(
  0.95,
  sum(rate(vllm:time_to_first_token_seconds_bucket[5m])) by (le)
)`;

export function EksVllmPlatformArticle() {
  return (
    <article className="blog-article">
      <header className="blog-article-header">
        <p className="blog-eyebrow">Platform engineering · AWS reference architecture</p>
        <h1>Building a Production-Ready GPU LLM Serving Platform on Kubernetes</h1>
        <p className="blog-lede">
          Large language models introduce a different set of operational challenges than traditional
          microservices. GPU memory, KV cache pressure, request queue depth, and token generation
          latency—not CPU utilization—become the dominant scaling signals. This article describes a
          Kubernetes-based GPU inference platform built with EKS, Karpenter, vLLM, Prometheus, and
          KEDA, with a full Terraform reference implementation in{" "}
          <a href={REPOS.eksVllm} target="_blank" rel="noopener noreferrer">
            taixingbi/eks-vllm
          </a>
          .
        </p>
      </header>

      <section>
        <h2>Architecture overview</h2>
        <p>
          The platform separates traffic entry, inference scheduling, model serving, and capacity
          provisioning. KEDA scales vLLM pods from Prometheus signals; Karpenter provisions GPU
          nodes when pods cannot schedule.
        </p>
        <BlogPre title="End-to-end stack">
          {`
Internet / Client
        │
        ▼
   ALB (HTTPS, 300s idle timeout)
        │
        ▼
   vLLM Service (OpenAI-compatible API)
        │
        ├── EFS shared model cache (~16 GB weights)
        │
        ▼
   NVIDIA GPUs on EC2
        │
        ├── Baseline: 2× On-Demand g5.4xlarge (1 replica/GPU, spread AZs)
        └── Burst: Karpenter Spot g5.4xlarge pool (up to ~8 nodes)

Autoscaling layers:
  Pods  → KEDA (Prometheus: queue depth, GPU cache, running requests)
  Nodes → Karpenter (pending pods requesting nvidia.com/gpu)
`.trim()}
        </BlogPre>
        <p>Responsibilities are intentionally separated:</p>
        <ul className="blog-list-check">
          <li>
            <strong>ALB</strong> — traffic entry, TLS termination, long-lived streaming connections
          </li>
          <li>
            <strong>vLLM</strong> — model inference only (continuous batching, PagedAttention)
          </li>
          <li>
            <strong>Kubernetes</strong> — pod lifecycle, probes, PDBs
          </li>
          <li>
            <strong>KEDA</strong> — event-driven replica scaling from inference metrics
          </li>
          <li>
            <strong>Karpenter</strong> — just-in-time GPU node provisioning
          </li>
        </ul>
      </section>

      <section>
        <h2>Why Karpenter instead of managed node groups</h2>
        <p>
          GPU workloads are expensive. Running idle GPU nodes can quickly become the largest
          infrastructure cost. Karpenter provisions capacity only when pods require it.
        </p>
        <p>When a model deployment requests GPUs:</p>
        <ol className="blog-list-ordered">
          <li>Kubernetes creates a pending pod.</li>
          <li>Karpenter observes the scheduling constraint.</li>
          <li>A matching GPU instance is launched.</li>
          <li>The pod becomes schedulable.</li>
        </ol>
        <p>
          NodePool manifests live under{" "}
          <a href={REPOS.karpenter} target="_blank" rel="noopener noreferrer">
            kubernetes/karpenter
          </a>
          . This reduces both operational complexity and idle spend compared to fixed-size managed
          node groups.
        </p>
      </section>

      <section>
        <h2>Why vLLM</h2>
        <p>
          vLLM has become one of the most widely adopted open-source inference engines for serving
          modern LLMs. Key advantages include:
        </p>
        <ul className="blog-list-check">
          <li>OpenAI-compatible APIs</li>
          <li>Continuous batching</li>
          <li>PagedAttention KV cache management</li>
          <li>Efficient GPU utilization</li>
          <li>Multi-model support and tensor parallelism</li>
        </ul>
        <p>
          For most organizations, vLLM provides significantly better throughput than naïve Hugging
          Face deployments while requiring minimal application changes. The reference repo pins vLLM
          v0.8.4 and serves <strong>Qwen/Qwen3-8B</strong> in bfloat16 with prefix caching enabled.
        </p>
      </section>

      <section>
        <h2>The autoscaling problem</h2>
        <p>
          Traditional Kubernetes autoscaling relies heavily on CPU and memory utilization. That
          approach breaks down for LLM serving.
        </p>
        <p>
          A GPU can appear healthy while users experience poor latency because request queues are
          growing, KV cache is nearly exhausted, long prompts reduce concurrency, or continuous
          batching reaches capacity. Scaling decisions must be driven by inference-specific signals.
        </p>
      </section>

      <section>
        <h2>Observability architecture</h2>
        <p>
          Prometheus scrapes vLLM metrics and feeds KEDA triggers and Grafana dashboards. Important
          metrics include:
        </p>
        <ul className="blog-list-check">
          <li>Request queue depth (<code>vllm:num_requests_waiting</code>)</li>
          <li>Time to first token (TTFT)</li>
          <li>End-to-end latency</li>
          <li>GPU cache utilization (<code>vllm:gpu_cache_usage_perc</code>)</li>
          <li>Token generation throughput</li>
        </ul>
        <p>
          These metrics provide a direct view into user experience rather than infrastructure
          utilization. Dashboards and alert rules are under{" "}
          <a href={REPOS.monitoring} target="_blank" rel="noopener noreferrer">
            kubernetes/monitoring
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Autoscaling with KEDA</h2>
        <p>
          KEDA acts as an event-driven autoscaler on top of Kubernetes. Instead of scaling from CPU
          usage, it scales from Prometheus queries defined in{" "}
          <a href={REPOS.kedaScaledObject} target="_blank" rel="noopener noreferrer">
            kubernetes/vllm
          </a>
          .
        </p>

        <h3>Primary signal: queue depth</h3>
        <p>
          The most reliable indicator of insufficient serving capacity is queued requests. If requests
          are waiting, additional capacity is needed.
        </p>
        <BlogPre title="Queue depth (alerts and scale-out)">{QUEUE_DEPTH_PROMQL}</BlogPre>

        <h3>Secondary signal: GPU cache pressure</h3>
        <p>
          GPU cache exhaustion frequently appears before user-visible failures. The reference repo
          scales pods when cache usage exceeds 80%.
        </p>
        <BlogPre title="GPU cache utilization">{GPU_CACHE_PROMQL}</BlogPre>

        <h3>Tertiary signal: TTFT</h3>
        <p>
          Time To First Token directly impacts perceived responsiveness. TTFT is valuable but
          inherently noisier than queue depth, making it a secondary decision factor rather than the
          primary trigger.
        </p>
        <BlogPre title="TTFT p95">{TTFT_PROMQL}</BlogPre>

        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>Layer</th>
                <th>Tool</th>
                <th>Trigger</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Pods</td>
                <td>KEDA</td>
                <td>
                  <code>vllm:gpu_cache_usage_perc</code> &gt; 80%,{" "}
                  <code>vllm:num_requests_running</code> &gt; 5
                </td>
              </tr>
              <tr>
                <td>Nodes</td>
                <td>Karpenter</td>
                <td>Pending pods requesting <code>nvidia.com/gpu</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Which signals to scale on</h2>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>Signal</th>
                <th>Good for scaling?</th>
                <th>Good for SLO / alerts?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Queue depth</td>
                <td>Yes (primary)</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>GPU cache %</td>
                <td>Yes (secondary)</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>TTFT p95</td>
                <td>Careful (noisy)</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Tokens/sec</td>
                <td>No</td>
                <td>Yes (capacity planning)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          High tokens/sec often indicates a healthy and fully utilized system; low tokens/sec may
          simply mean traffic is low. Throughput is excellent for capacity planning and SLO
          monitoring—but much less useful as a primary autoscaling trigger.
        </p>
      </section>

      <section>
        <h2>Production hardening</h2>
        <p>Several additional controls are required before running critical workloads.</p>

        <h3>Availability</h3>
        <ul className="blog-list-check">
          <li>PodDisruptionBudgets (min 2 On-Demand replicas across AZs)</li>
          <li>Rolling deployments with 120s termination grace for Spot safety</li>
          <li>Graceful shutdown and startup probes (model load allows up to 5 minutes)</li>
          <li>Readiness probes tied to vLLM health</li>
        </ul>

        <h3>Security</h3>
        <ul className="blog-list-check">
          <li>Private networking and IRSA for EFS CSI / CloudWatch</li>
          <li>Secrets via External Secrets Operator (e.g. HuggingFace token)</li>
          <li>ECR image scanning on push</li>
          <li>Least-privilege IAM</li>
        </ul>

        <h3>Reliability</h3>
        <ul className="blog-list-check">
          <li>SLO monitoring and alerting on queue depth and TTFT</li>
          <li>Load testing to validate KEDA + Karpenter behavior</li>
          <li>Capacity forecasting and GPU quota management</li>
          <li>
            <strong>Scale-in lag / cold start</strong> — EFS model cache plus a model-seed Job means
            new pods and nodes need minutes, not seconds; KEDA cooldown must exceed max generation
            time
          </li>
        </ul>
      </section>

      <section>
        <h2>Lessons learned</h2>
        <p>
          The biggest lesson from building GPU platforms is that scaling GPUs is fundamentally
          different from scaling web servers. The most effective autoscaling signals are not CPU
          utilization or request rate—they are:
        </p>
        <ol className="blog-list-ordered">
          <li>Queue depth</li>
          <li>GPU cache pressure</li>
          <li>Time to first token</li>
        </ol>
        <p>
          By combining Kubernetes, Karpenter, Prometheus, and KEDA around these signals, it is
          possible to build a cost-efficient and production-ready inference platform capable of
          serving modern large language models at scale.
        </p>
      </section>

      <section>
        <h2>Reference implementation</h2>
        <p>
          The full rollout—Terraform bootstrap, EKS + VPC + EFS, Karpenter NodePools, vLLM
          Deployment, KEDA ScaledObject, and monitoring—is documented in{" "}
          <a href={REPOS.eksVllm} target="_blank" rel="noopener noreferrer">
            taixingbi/eks-vllm
          </a>
          .
        </p>
        <div className="blog-service-table-wrap">
          <table className="blog-service-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Infrastructure</td>
                <td>
                  <a href={REPOS.terraformProd} target="_blank" rel="noopener noreferrer">
                    terraform/environments/prod
                  </a>
                </td>
              </tr>
              <tr>
                <td>Pod autoscaling</td>
                <td>
                  <a href={REPOS.kedaScaledObject} target="_blank" rel="noopener noreferrer">
                    kubernetes/vllm/keda-scaledobject.yaml
                  </a>
                </td>
              </tr>
              <tr>
                <td>Node autoscaling</td>
                <td>
                  <a href={REPOS.karpenter} target="_blank" rel="noopener noreferrer">
                    kubernetes/karpenter
                  </a>
                </td>
              </tr>
              <tr>
                <td>Observability</td>
                <td>
                  <a href={REPOS.monitoring} target="_blank" rel="noopener noreferrer">
                    kubernetes/monitoring
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Estimated baseline cost in us-east-1: ~$3,150/month (2× On-Demand g5.4xlarge, EKS control
          plane, EFS, NAT, ALB, partial Spot burst). Request <code>g5.4xlarge</code> quota before
          deploy.
        </p>
      </section>

      <section>
        <h2>Related reading</h2>
        <ul className="blog-link-list">
          <li>
            <a href={REPOS.eksVllm} target="_blank" rel="noopener noreferrer" className="blog-inline-link">
              taixingbi/eks-vllm
            </a>
            {" — Terraform + Kubernetes reference repo for this architecture"}
          </li>
          <li>
            <Link href={blogPostPath("layer-gateway-inference-design")} className="blog-inline-link">
              GPU-Aware Inference Routing
            </Link>
            {" — HuntAI uses k3s + gateway-level queue routing instead of KEDA pod scaling; similar queue and latency signals"}
          </li>
          <li>
            <Link href={blogPostPath("grafana-observability")} className="blog-inline-link">
              Observability with Grafana Cloud
            </Link>
            {" — vLLM Prometheus metrics and alerting patterns on a homelab cluster"}
          </li>
        </ul>
      </section>
    </article>
  );
}
