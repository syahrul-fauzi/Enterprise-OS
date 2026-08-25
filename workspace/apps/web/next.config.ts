import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/core-kernel"],
  productionBrowserSourceMaps: false,
  turbopack: {},
};

export default nextConfig;