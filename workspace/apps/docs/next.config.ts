import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: '/root/Enterprise-OS/workspace',
  },
};

export default nextConfig;