/**
 * Redis PING probe for admin service health (RESP over TCP).
 */

import { createConnection } from "net";

import { adminConfig } from "@/lib/admin/config";
import type { AdminServiceHealth, ServiceStatus } from "@/lib/admin/types";

function parseRedisEndpoint(url: string): { host: string; port: number } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
      return null;
    }
    const port = parsed.port ? Number.parseInt(parsed.port, 10) : 6379;
    if (!Number.isFinite(port)) return null;
    return { host: parsed.hostname || "127.0.0.1", port };
  } catch {
    return null;
  }
}

function redisPing(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    const timer = setTimeout(() => finish(false), timeoutMs);

    socket.on("connect", () => {
      socket.write("*1\r\n$4\r\nPING\r\n");
    });

    socket.on("data", (chunk) => {
      clearTimeout(timer);
      const text = chunk.toString("utf8");
      finish(text.includes("PONG"));
    });

    socket.on("error", () => {
      clearTimeout(timer);
      finish(false);
    });
  });
}

/** Probe Redis with RESP PING (no npm redis client required). */
export async function probeRedisHealth(): Promise<AdminServiceHealth> {
  const url = adminConfig.redisUrl;
  const configured = Boolean(url);
  if (!configured) {
    return {
      id: "redis",
      name: "Redis",
      status: "unknown",
      detail: "REDIS_URL not configured",
    };
  }

  const endpoint = parseRedisEndpoint(url);
  if (!endpoint) {
    return {
      id: "redis",
      name: "Redis",
      status: "unhealthy",
      detail: "Invalid REDIS_URL",
    };
  }

  try {
    const ok = await redisPing(endpoint.host, endpoint.port, adminConfig.healthTimeoutMs);
    const status: ServiceStatus = ok ? "healthy" : "unhealthy";
    return {
      id: "redis",
      name: "Redis",
      status,
      detail: ok ? null : "PING failed",
    };
  } catch (err) {
    return {
      id: "redis",
      name: "Redis",
      status: "unhealthy",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
