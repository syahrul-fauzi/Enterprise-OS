/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
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
    "@repo/presentation-ui-system",
    "@repo/presentation-types",
    "@repo/presentation-foundation",
    "@repo/presentation-widgets",
    "@repo/presentation-features",
    "@repo/presentation-experience",
    "@repo/presentation-hooks",
    "@repo/tooling-eos-cli",
    "@repo/tooling-arch-tests",
    "@repo/tooling-t001-standalone",
    "@repo/core-platform",
    "capabilities",
    "products",
  ],
  productionBrowserSourceMaps: false,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  turbopack: {
    resolveExtensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /@repo\/.*/,
      resolve: {
        fullySpecified: false,
      },
    });
    return config;
  },
};

export default nextConfig;