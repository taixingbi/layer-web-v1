/**
 * Unit tests for {@link resolveGatewayBearer} (header vs cookie precedence).
 */

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { LAYER_ACCESS_TOKEN_COOKIE } from "./auth-cookie";
import { resolveGatewayBearer } from "./gateway-auth";
import { webApiPaths } from "./web-api-paths";

describe("resolveGatewayBearer", () => {
  it("uses Authorization header when present", () => {
    const req = new NextRequest(`http://localhost${webApiPaths.chat}`, {
      headers: { Authorization: "Bearer client-jwt" },
    });
    expect(resolveGatewayBearer(req)).toBe("client-jwt");
  });

  it("uses session cookie when no Authorization header", () => {
    const req = new NextRequest(`http://localhost${webApiPaths.chat}`, {
      headers: { cookie: `${LAYER_ACCESS_TOKEN_COOKIE}=from-cookie` },
    });
    expect(resolveGatewayBearer(req)).toBe("from-cookie");
  });

  it("prefers Authorization over cookie", () => {
    const req = new NextRequest(`http://localhost${webApiPaths.chat}`, {
      headers: {
        Authorization: "Bearer from-header",
        cookie: `${LAYER_ACCESS_TOKEN_COOKIE}=from-cookie`,
      },
    });
    expect(resolveGatewayBearer(req)).toBe("from-header");
  });

  it("returns empty string when unsigned in", () => {
    const req = new NextRequest(`http://localhost${webApiPaths.chat}`);
    expect(resolveGatewayBearer(req)).toBe("");
  });

  it("uses guest bearer when allowGuestFallback and env are set", () => {
    const prevAllow = process.env.CHAT_ALLOW_GUEST;
    const prevToken = process.env.GUEST_CHAT_BEARER_TOKEN;
    process.env.CHAT_ALLOW_GUEST = "true";
    process.env.GUEST_CHAT_BEARER_TOKEN = "guest-service-token";
    try {
      const req = new NextRequest(`http://localhost${webApiPaths.chat}`);
      expect(resolveGatewayBearer(req, { allowGuestFallback: true })).toBe(
        "guest-service-token",
      );
    } finally {
      if (prevAllow === undefined) delete process.env.CHAT_ALLOW_GUEST;
      else process.env.CHAT_ALLOW_GUEST = prevAllow;
      if (prevToken === undefined) delete process.env.GUEST_CHAT_BEARER_TOKEN;
      else process.env.GUEST_CHAT_BEARER_TOKEN = prevToken;
    }
  });
});
