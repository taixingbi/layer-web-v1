/**
 * Versioned public paths on layer-gateway-api-v1 (see gateway ``docs/schema.md``).
 * Profile remains unversioned on the gateway (`/profile`).
 */

export const gatewayPaths = {
  chat: "/v1/chat",
  feedback: "/v1/feedback",
  conversations: "/v1/conversations",
  conversationMessages: (conversationId: string) =>
    `/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
  auth: {
    signup: "/v1/auth/signup",
    login: "/v1/auth/login",
    refresh: "/v1/auth/refresh",
    forgotPassword: "/v1/auth/forgot-password",
    resetPassword: "/v1/auth/reset-password",
    changePassword: "/v1/auth/change-password",
  },
} as const;
