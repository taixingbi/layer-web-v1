/**
 * Versioned public BFF routes (browser and curl hit these on the Next.js host).
 * Server routes live under ``app/api/v1/``; gateway upstream paths are in ``gateway-paths.ts``.
 */

const V1 = "/api/v1";

export const webApiPaths = {
  admin: {
    overview: "/api/admin/overview",
    logs: "/api/admin/logs",
    argocdApps: "/api/admin/argocd/apps",
    argocdApp: (name: string) => `/api/admin/argocd/apps/${encodeURIComponent(name)}`,
  },
  train: {
    access: "/api/train/access",
    routerOverview: "/api/train/router/overview",
  },
  chat: `${V1}/chat`,
  feedback: `${V1}/feedback`,
  conversations: `${V1}/conversations`,
  conversationMessages: (conversationId: string) =>
    `${V1}/conversations/${encodeURIComponent(conversationId)}/messages`,
  profile: `${V1}/profile`,
  auth: {
    login: `${V1}/auth/login`,
    signup: `${V1}/auth/signup`,
    logout: `${V1}/auth/logout`,
    me: `${V1}/auth/me`,
    config: `${V1}/auth/config`,
    forgotPassword: `${V1}/auth/forgot-password`,
    resetPassword: `${V1}/auth/reset-password`,
    resetLinkOpened: `${V1}/auth/reset-link-opened`,
  },
} as const;
