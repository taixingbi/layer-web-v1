/** CI/CD Applications stack env from public site hostname. */

export type CicdDeployEnv = "dev" | "prod";

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

/**
 * Map browser hostname to Argo application stack.
 * - ``dev.taixingai.com`` → dev (ai-dev)
 * - ``taixingai.com`` / ``www.taixingai.com`` → prod (ai-prod)
 * - localhost / LAN dev hosts → dev
 */
export function cicdEnvFromHostname(hostname: string): CicdDeployEnv {
  const host = normalizeHostname(hostname);
  if (!host) return "dev";

  if (host === "taixingai.com" || host === "www.taixingai.com") {
    return "prod";
  }
  if (host === "dev.taixingai.com" || host.startsWith("dev.")) {
    return "dev";
  }

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    /^192\.168\.\d+\.\d+$/.test(host) ||
    /^10\.\d+\.\d+\.\d+$/.test(host)
  ) {
    return "dev";
  }

  return "dev";
}
