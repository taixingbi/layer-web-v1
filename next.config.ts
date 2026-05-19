/**
 * Next.js configuration (standalone output for container deploys).
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    useLightningcss: false,
  },
};

export default nextConfig;
