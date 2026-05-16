import { afterEach, describe, expect, it, vi } from "vitest";

import { probeGatewayBearer, shouldValidateTokenOnLogin } from "./validate-gateway-bearer";

describe("shouldValidateTokenOnLogin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to true", () => {
    expect(shouldValidateTokenOnLogin()).toBe(true);
  });

  it("returns false when AUTH_VALIDATE_TOKEN_ON_LOGIN=false", () => {
    vi.stubEnv("AUTH_VALIDATE_TOKEN_ON_LOGIN", "false");
    expect(shouldValidateTokenOnLogin()).toBe(false);
  });
});

describe("probeGatewayBearer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("treats non-401 as accepted auth", async () => {
    vi.stubEnv("GATEWAY_BASE_URL", "http://gateway.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "bad request" }), { status: 422 })
      )
    );
    const result = await probeGatewayBearer("any-token");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.gatewayStatus).toBe(422);
  });

  it("rejects 401 from gateway", async () => {
    vi.stubEnv("GATEWAY_BASE_URL", "http://gateway.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "Invalid or expired bearer token" } }),
          { status: 401 }
        )
      )
    );
    const result = await probeGatewayBearer("bad-jwt");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.gatewayStatus).toBe(401);
      expect(result.message).toContain("Invalid or expired");
    }
  });
});
