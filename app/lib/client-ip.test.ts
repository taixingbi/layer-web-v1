import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import {
  gatewayClientIpHeaders,
  resolveClientIp,
  resolveClientIpFromHeaders,
} from "@/lib/client-ip";

describe("resolveClientIpFromHeaders", () => {
  it("prefers cf-connecting-ip", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.2, 10.0.0.1",
    });
    expect(resolveClientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("uses first x-forwarded-for hop", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.5, 10.42.1.165",
    });
    expect(resolveClientIpFromHeaders(headers)).toBe("198.51.100.5");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "192.0.2.44" });
    expect(resolveClientIpFromHeaders(headers)).toBe("192.0.2.44");
  });

  it("accepts bracketed IPv6", () => {
    const headers = new Headers({ "cf-connecting-ip": "[2001:db8::1]" });
    expect(resolveClientIpFromHeaders(headers)).toBe("2001:db8::1");
  });

  it("rejects invalid values", () => {
    const headers = new Headers({ "x-forwarded-for": "not-an-ip" });
    expect(resolveClientIpFromHeaders(headers)).toBeNull();
  });
});

describe("resolveClientIp", () => {
  it("reads from NextRequest headers", () => {
    const req = new NextRequest("http://localhost/api/v1/chat", {
      headers: { "cf-connecting-ip": "203.0.113.77" },
    });
    expect(resolveClientIp(req)).toBe("203.0.113.77");
  });
});

describe("gatewayClientIpHeaders", () => {
  it("returns X-Forwarded-For when IP is known", () => {
    const req = new NextRequest("http://localhost/api/v1/chat", {
      headers: { "cf-connecting-ip": "203.0.113.77" },
    });
    expect(gatewayClientIpHeaders(req)).toEqual({ "X-Forwarded-For": "203.0.113.77" });
  });

  it("returns empty object when IP is unknown", () => {
    const req = new NextRequest("http://localhost/api/v1/chat");
    expect(gatewayClientIpHeaders(req)).toEqual({});
  });
});
