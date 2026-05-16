import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { LAYER_ACCESS_TOKEN_COOKIE } from "./auth-cookie";
import { resolveGatewayBearer } from "./gateway-auth";

describe("resolveGatewayBearer", () => {
  it("prefers client Authorization over env when both present", () => {
    vi.stubEnv("GATEWAY_BEARER_TOKEN", "env-token");
    const req = new NextRequest("http://localhost/api/chat", {
      headers: { authorization: "Bearer client-jwt" },
    });
    expect(resolveGatewayBearer(req)).toBe("client-jwt");
    vi.unstubAllEnvs();
  });

  it("uses GATEWAY_BEARER_TOKEN when no Authorization header", () => {
    vi.stubEnv("GATEWAY_BEARER_TOKEN", "fallback-from-env");
    const req = new NextRequest("http://localhost/api/chat");
    expect(resolveGatewayBearer(req)).toBe("fallback-from-env");
    vi.unstubAllEnvs();
  });

  it("uses cookie when no Authorization header", () => {
    vi.stubEnv("GATEWAY_BEARER_TOKEN", "env-token");
    const req = new NextRequest("http://localhost/api/chat", {
      headers: { cookie: `${LAYER_ACCESS_TOKEN_COOKIE}=from-cookie` },
    });
    expect(resolveGatewayBearer(req)).toBe("from-cookie");
    vi.unstubAllEnvs();
  });

  it("prefers Authorization over cookie and env", () => {
    vi.stubEnv("GATEWAY_BEARER_TOKEN", "env-token");
    const req = new NextRequest("http://localhost/api/chat", {
      headers: {
        authorization: "Bearer from-header",
        cookie: `${LAYER_ACCESS_TOKEN_COOKIE}=from-cookie`,
      },
    });
    expect(resolveGatewayBearer(req)).toBe("from-header");
    vi.unstubAllEnvs();
  });

  it("ignores empty bearer and falls back to env", () => {
    vi.stubEnv("GATEWAY_BEARER_TOKEN", "env-only");
    const reqEmpty = new NextRequest("http://localhost/api/chat", {
      headers: { authorization: "Bearer   " },
    });
    expect(resolveGatewayBearer(reqEmpty)).toBe("env-only");
    vi.unstubAllEnvs();
  });

  it("ignores empty bearer and uses cookie before env", () => {
    vi.stubEnv("GATEWAY_BEARER_TOKEN", "env-only");
    const req = new NextRequest("http://localhost/api/chat", {
      headers: {
        authorization: "Bearer   ",
        cookie: `${LAYER_ACCESS_TOKEN_COOKIE}=cookie-jwt`,
      },
    });
    expect(resolveGatewayBearer(req)).toBe("cookie-jwt");
    vi.unstubAllEnvs();
  });
});
