import { describe, expect, it } from "vitest";

import { parseEvalReportMarkdown } from "@/lib/train/parse-eval-report";
import { snapshotEvalReports } from "@/lib/train/router-eval-snapshot";

describe("parseEvalReportMarkdown", () => {
  it("parses snapshot SFT report", () => {
    const snap = snapshotEvalReports();
    expect(snap.sft.accuracyPct).toBeCloseTo(98.7, 1);
    expect(snap.sft.total).toBe(77);
    expect(snap.sft.failures).toHaveLength(1);
    expect(snap.sft.routeRows.length).toBeGreaterThan(0);
  });

  it("parses DPO failures", () => {
    const snap = snapshotEvalReports();
    expect(snap.dpo.accuracyPct).toBeCloseTo(97.4, 1);
    expect(snap.dpo.failures).toHaveLength(2);
  });

  it("parses live-style markdown", () => {
    const md = `# Router eval report
| Total rows | 77 |
| \`route_match\` = true | 76 |
| \`route_match\` = false | 1 |
| **Match rate** (true / (true+false)) | **98.7%** |
## Per file
| \`router_help.csv\` | 5 | 5 | 0 | 0 | 0 | 100.0% |
`;
    const p = parseEvalReportMarkdown(md, "test");
    expect(p.accuracyPct).toBeCloseTo(98.7, 1);
    expect(p.correct).toBe(76);
  });
});
