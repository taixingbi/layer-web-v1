/**
 * Unit tests for auth log masking ({@link maskIdentifier}, {@link maskGatewayPayload}).
 */

import { describe, expect, it } from "vitest";

import { maskGatewayPayload, maskIdentifier } from "./auth-route-log";

describe("auth-route-log", () => {
  it("maskIdentifier masks email local part", () => {
    expect(maskIdentifier("user@example.com")).toBe("***@example.com");
    expect(maskIdentifier("myuser")).toBe("***");
  });

  it("maskGatewayPayload redacts secrets", () => {
    expect(
      maskGatewayPayload({
        email: "a@b.com",
        password: "secret",
        access_token: "eyJabc",
        refresh_token: "rt",
      }),
    ).toEqual({
      email: "a@b.com",
      password: "[redacted]",
      access_token: "...",
      refresh_token: "...",
    });
  });
});
