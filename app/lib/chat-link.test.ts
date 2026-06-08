import { describe, expect, it } from "vitest";

import { normalizeChatLinkHref } from "@/lib/chat-link";

describe("normalizeChatLinkHref", () => {
  it("rewrites GitHub blog blob URLs to /blog/slug", () => {
    expect(
      normalizeChatLinkHref(
        "https://github.com/taixingbi/layer-web-v1/blob/main/app/blog/grafana-observability/page.tsx",
      ),
    ).toBe("/blog/grafana-observability");
  });

  it("leaves other URLs unchanged", () => {
    expect(normalizeChatLinkHref("https://github.com/taixingbi/layer-web-v1")).toBe(
      "https://github.com/taixingbi/layer-web-v1",
    );
    expect(normalizeChatLinkHref("/blog/building-an-ai-orchestrator")).toBe(
      "/blog/building-an-ai-orchestrator",
    );
  });
});
