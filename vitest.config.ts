/**
 * Vitest configuration for unit tests under ``app/`` with ``@`` path alias.
 */

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app"),
    },
  },
});
