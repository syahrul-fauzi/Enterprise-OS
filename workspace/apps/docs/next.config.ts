import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Hapus hardcoded turbopack root agar Turbopack mendeteksi workspace root secara otomatis
  // turbopack: {
  //   root: '/root/Enterprise-OS/workspace',
  // },
};

export default nextConfig;