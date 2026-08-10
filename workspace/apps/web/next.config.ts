import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
  },
  transpilePackages: ["@repo/presentation-ui-system", "@repo/presentation-widgets"],
};

export default nextConfig;
