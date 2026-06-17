/** One-line summaries from health/readiness probe JSON bodies. */

function depSummary(deps: Record<string, unknown>): string | null {
  const failed: string[] = [];
  for (const [name, raw] of Object.entries(deps)) {
    if (!raw || typeof raw !== "object") continue;
    const dep = raw as Record<string, unknown>;
    if (dep.ok === false) {
      const err =
        (typeof dep.error === "string" && dep.error.trim()) ||
        (typeof dep.status === "string" && dep.status.trim()) ||
        "fail";
      failed.push(`${name}: ${err}`);
    }
  }
  return failed.length > 0 ? failed.join(" · ") : null;
}

function backendsSummary(body: Record<string, unknown>): string | null {
  const backends = body.backends;
  if (!backends || typeof backends !== "object") return null;
  const entries = Object.entries(backends as Record<string, unknown>);
  const unhealthy = entries.filter(([, v]) => v !== "healthy");
  if (unhealthy.length > 0) {
    return unhealthy.map(([k, v]) => `${k}: ${String(v)}`).join(" · ");
  }
  const healthy = body.healthy_backends;
  const total = body.total_backends;
  if (typeof healthy === "number" && typeof total === "number" && healthy < total) {
    return `${healthy}/${total} backends healthy`;
  }
  return null;
}

export function summarizeReadyBody(body: Record<string, unknown> | null | undefined): string | null {
  if (!body) return null;

  const deps = body.dependencies;
  if (deps && typeof deps === "object") {
    const fromDeps = depSummary(deps as Record<string, unknown>);
    if (fromDeps) return fromDeps;
  }

  const fromBackends = backendsSummary(body);
  if (fromBackends) return fromBackends;

  if (typeof body.detail === "string" && body.detail.trim()) {
    return body.detail.trim();
  }

  const status = body.status;
  if (typeof status === "string" && status.trim() && status !== "ok" && status !== "ready") {
    return status.trim();
  }

  return null;
}

export function summarizeServiceProbe(input: {
  healthOk: boolean;
  readyOk: boolean | null;
  healthDetail: string | null;
  healthBody: Record<string, unknown> | null;
  readyBody: Record<string, unknown> | null;
}): string | null {
  if (input.readyOk === false) {
    const fromReady = summarizeReadyBody(input.readyBody);
    if (fromReady) return fromReady;
    return "readiness check failed";
  }

  if (!input.healthOk) {
    return (
      input.healthDetail ??
      summarizeReadyBody(input.healthBody) ??
      (typeof input.healthBody?.error === "string" ? input.healthBody.error : null) ??
      "health check failed"
    );
  }

  return input.healthDetail;
}
