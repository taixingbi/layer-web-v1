/** Build metadata for GET /version (no dependency checks). */

const SERVICE_NAME = "layer-web-v1";

function env(name: string, fallback = "unknown"): string {
  const value = (process.env[name] ?? "").trim();
  return value || fallback;
}

export function versionPayload(): Record<string, string> {
  const environment =
    (process.env.ENVIRONMENT ?? "").trim() ||
    (process.env.ENV ?? "").trim() ||
    "dev";
  return {
    service: SERVICE_NAME,
    version: env("APP_VERSION", "dev"),
    git_sha: env("GIT_SHA"),
    git_branch: env("GIT_BRANCH"),
    build_time: env("BUILD_TIME"),
    image: env("BUILD_IMAGE"),
    image_digest: env("IMAGE_DIGEST"),
    environment,
    status: "ok",
  };
}
