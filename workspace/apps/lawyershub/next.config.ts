import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
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
