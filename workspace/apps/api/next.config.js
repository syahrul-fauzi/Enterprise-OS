/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed FACE-related redirect (API-only root serves health check)
  async redirects() {
    return [];
  },
  transpilePackages: [
    // Core-only packages (removed all presentation/UI/tooling packages for API standalone)
    "@repo/core-kernel",
    "@repo/core-runtime",
    "@repo/core-eir",
    "@repo/core-transformation-registry",
    "@repo/core-predicate-registry",
    "@repo/core-proof-ledger",
    "@repo/core-constitution",
    "@repo/core-capability-registry",
    "@repo/core-registry-resolver",
    "@repo/composition",
    "@repo/composition-legal-workspace",
    "@repo/core-platform",
  ],
  productionBrowserSourceMaps: false,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  turbopack: {},
  // Fix node: prefix import error - mark node built-ins as server-only external packages (Next.js 16+)
  serverExternalPackages: ['async_hooks', 'fs', 'path', 'url', 'stream', 'http', 'https', 'net', 'tls', 'zlib', 'buffer', 'util', 'events', 'crypto'],
  outputFileTracingRoot: '/root/Enterprise-OS',
  webpack: (config) => {
    config.module.rules.push({
      test: /@repo\/.*/,
      resolve: {
        fullySpecified: false,
      },
    });
    // Handle node: prefix imports by marking them as externals
    const nodeBuiltins = ['async_hooks', 'fs', 'path', 'url', 'stream', 'http', 'https', 'net', 'tls', 'zlib', 'buffer', 'util', 'events', 'crypto'];
    nodeBuiltins.forEach(moduleName => {
      config.externals.push(`node:${moduleName}`);
    });
    return config;
  },
};

export default nextConfig;