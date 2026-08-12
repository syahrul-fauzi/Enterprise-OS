import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
  },
  transpilePackages: ["@repo/presentation-ui-system", "@repo/presentation-widgets"],
  webpack: (config, { isServer }) => {
    // Externalize Node.js core modules and server-only packages from client bundles
    if (!isServer) {
      config.externals = [
        ...(config.externals || []),
        "pg",
        "node:fs",
        "node:net",
        "node:dns",
        "node:tls",
        "node:util/types",
      ];
    }
    return config;
  },
};

export default nextConfig;