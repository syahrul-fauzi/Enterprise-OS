import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@repo/core-kernel",
    "@repo/core-runtime",
    "@repo/core-capability-registry",
    "@repo/presentation-ui-system",
    "@repo/presentation-foundation",
  ],
};

export default nextConfig;
