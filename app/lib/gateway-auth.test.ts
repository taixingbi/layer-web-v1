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
});
