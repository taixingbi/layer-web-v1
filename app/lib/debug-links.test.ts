import { describe, expect, it } from "vitest";
import { grafanaHomeUrl, grafanaTraceUrl, huntaiGitHubUrl } from "./debug-links";

describe("grafanaTraceUrl", () => {
  it("defaults to taixingbi Grafana Cloud explore with trace in Loki query", () => {
    const url = grafanaTraceUrl("trace_abc123");
    expect(url).toMatch(/^https:\/\/taixingbi\.grafana\.net\/explore\?/);
    expect(url).toContain(encodeURIComponent("trace_abc123"));
    expect(url).toContain("now-24h");
  });

  it("returns null without trace id", () => {
    expect(grafanaTraceUrl(undefined)).toBeNull();
    expect(grafanaTraceUrl("")).toBeNull();
  });
});

describe("grafanaHomeUrl", () => {
  it("points at the HuntAI Grafana Cloud stack", () => {
    expect(grafanaHomeUrl()).toBe("https://taixingbi.grafana.net/");
  });
});

describe("huntaiGitHubUrl", () => {
  it("lists taixingbi repositories matching huntai", () => {
    expect(huntaiGitHubUrl()).toBe(
      "https://github.com/taixingbi?tab=repositories&q=huntai&type=&language=&sort=",
    );
  });
});
