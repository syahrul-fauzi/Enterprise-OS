import path from "node:path";
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    turbopack: {
        root: path.resolve(import.meta.dirname, "../.."),
    },
};
export default nextConfig;
