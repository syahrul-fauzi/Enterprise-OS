import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/core-kernel", "@repo/presentation-ui-system"],
  productionBrowserSourceMaps: false,
  turbopack: {
    resolveExtensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /@repo\/capabilities-identity|@repo\/presentation-ui-system/,
      resolve: {
        fullySpecified: false,
      },
    });
    return config;
  },
};

export default nextConfig;