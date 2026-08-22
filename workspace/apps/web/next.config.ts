import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/core-kernel"],
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {} as any;
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
    };
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