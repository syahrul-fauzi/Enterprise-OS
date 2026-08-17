import path from "node:path";
const nextConfig = {
    turbopack: {
        root: path.resolve(import.meta.dirname, "../.."),
        resolveAlias: {
            "@repo/presentation-hooks": "./packages/presentation/hooks/dist",
            "@repo/presentation-widgets": "./packages/presentation/widgets/dist",
            "@repo/presentation-experience": "./packages/presentation/experience/dist",
        },
    },
    transpilePackages: ["@repo/core-kernel"],
    webpack: (config, { isServer }) => {
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            "@repo/presentation-hooks": path.resolve(import.meta.dirname, "../../packages/presentation/hooks/dist"),
            "@repo/presentation-widgets": path.resolve(import.meta.dirname, "../../packages/presentation/widgets/dist"),
            "@repo/presentation-experience": path.resolve(import.meta.dirname, "../../packages/presentation/experience/dist"),
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
