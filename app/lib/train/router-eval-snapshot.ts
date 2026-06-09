import type { ParsedEvalReport } from "@/lib/train/parse-eval-report";
import { parseEvalReportMarkdown } from "@/lib/train/parse-eval-report";
import {
  ROUTER_DPO_LORA_ID,
  ROUTER_SFT_LORA_ID,
} from "@/lib/train/router-constants";

const BASE_MD = `# Router eval report

- **Generated (UTC):** 2026-06-09T19:47:06Z
- **Router prompt version:** \`router-v2.00\`

## Summary

| Metric | Count |
|--------|-------|
| Total rows | 77 |
| \`route_match\` = true | 76 |
| \`route_match\` = false | 1 |
| **Match rate** (true / (true+false)) | **98.7%** |

## Per file

| File | Rows |
|------|-----:|
| \`router_capabilities.csv\` | 7 |
| \`router_github.csv\` | 4 |
| \`router_greeting.csv\` | 18 |
| \`router_help.csv\` | 5 |
| \`router_identity.csv\` | 7 |
| \`router_rag_private_kb.csv\` | 27 |
| \`router_reject.csv\` | 8 |
| \`router_web_search.csv\` | 1 |

## Bad items (\`route_match\` = false)

| Source file | expected_route | actual_route | question |
|-------------|----------------|--------------|----------|
| \`router_web_search.csv\` | web_search | github_search | Find official docs for FastMCP streaming |
`;

const SFT_MD = BASE_MD.replace(
  "2026-06-09T19:47:06Z",
  "2026-06-09T19:36:48Z",
).replace(
  "## Summary",
  `- **Router model:** \`${ROUTER_SFT_LORA_ID}\`\n\n## Summary`,
);

const DPO_MD = `# Router eval report

- **Generated (UTC):** 2026-06-09T19:37:34Z
- **Router prompt version:** \`router-v2.00\`
- **Router model:** \`${ROUTER_DPO_LORA_ID}\`

## Summary

| Metric | Count |
|--------|-------|
| Total rows | 77 |
| \`route_match\` = true | 75 |
| \`route_match\` = false | 2 |
| **Match rate** (true / (true+false)) | **97.4%** |

## Per file

| File | Rows |
|------|-----:|
| \`router_capabilities.csv\` | 7 |
| \`router_github.csv\` | 4 |
| \`router_greeting.csv\` | 18 |
| \`router_help.csv\` | 5 |
| \`router_identity.csv\` | 7 |
| \`router_rag_private_kb.csv\` | 27 |
| \`router_reject.csv\` | 8 |
| \`router_web_search.csv\` | 1 |

## Bad items (\`route_match\` = false)

| Source file | expected_route | actual_route | question |
|-------------|----------------|--------------|----------|
| \`router_greeting.csv\` | greeting | rag_private_kb | Tell me a funny story? |
| \`router_web_search.csv\` | web_search | github_search | Find official docs for FastMCP streaming |
`;

export function snapshotEvalReports(): Record<"base" | "sft" | "dpo", ParsedEvalReport> {
  return {
    base: parseEvalReportMarkdown(BASE_MD, "base"),
    sft: parseEvalReportMarkdown(SFT_MD, ROUTER_SFT_LORA_ID),
    dpo: parseEvalReportMarkdown(DPO_MD, ROUTER_DPO_LORA_ID),
  };
}
