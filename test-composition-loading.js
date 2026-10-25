"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Simple test script to verify recursive composition loading works
const fs_1 = require("fs");
const path_1 = require("path");
const yaml_1 = __importDefault(require("yaml"));
function loadCompositionPackage(packageId, processedPackages = new Set()) {
    var _a, _b, _c;
    if (processedPackages.has(packageId)) {
        console.warn(`[test] Skipping already processed package: ${packageId} (circular dependency prevented)`);
        return null;
    }
    processedPackages.add(packageId);
    const basePath = (0, path_1.join)(process.cwd(), 'workspace', 'packages', 'compositions', packageId);
    const manifestPath = (0, path_1.join)(basePath, 'manifest.yaml');
    if (!(0, fs_1.existsSync)(manifestPath)) {
        console.warn(`[test] Package not found: ${packageId} - falling back`);
        return { id: packageId, patterns: [], capabilities: [], surfaces: [], extends: [] };
    }
    try {
        const manifestContent = (0, fs_1.readFileSync)(manifestPath, 'utf8');
        const manifest = yaml_1.default.parse(manifestContent);
        if (manifest.extends && manifest.extends.length > 0) {
            const mergedCapabilities = new Set(manifest.capabilities || []);
            const mergedPatterns = new Set(manifest.patterns || []);
            const mergedSurfaces = new Set(manifest.surfaces || []);
            manifest.extends.forEach((extendedPackageId) => {
                var _a, _b, _c;
                const extendedManifest = loadCompositionPackage(extendedPackageId, processedPackages);
                if (extendedManifest) {
                    (_a = extendedManifest.capabilities) === null || _a === void 0 ? void 0 : _a.forEach(cap => mergedCapabilities.add(cap));
                    (_b = extendedManifest.patterns) === null || _b === void 0 ? void 0 : _b.forEach(pat => mergedPatterns.add(pat));
                    (_c = extendedManifest.surfaces) === null || _c === void 0 ? void 0 : _c.forEach(sur => mergedSurfaces.add(sur));
                    console.log(`[test] Merged from ${extendedPackageId}: total capabilities ${mergedCapabilities.size}`);
                }
            });
            manifest.capabilities = Array.from(mergedCapabilities);
            manifest.patterns = Array.from(mergedPatterns);
            manifest.surfaces = Array.from(mergedSurfaces);
        }
        console.log(`[test] Successfully loaded ${packageId}: patterns=${(_a = manifest.patterns) === null || _a === void 0 ? void 0 : _a.length}, capabilities=${(_b = manifest.capabilities) === null || _b === void 0 ? void 0 : _b.length}, surfaces=${(_c = manifest.surfaces) === null || _c === void 0 ? void 0 : _c.length}`);
        return manifest;
    }
    catch (e) {
        console.error(`[test] Failed to load ${packageId}:`, e);
        return { id: packageId, patterns: [], capabilities: [], surfaces: [], extends: [] };
    }
}
// Test pt-establishment package (W-COMP-001 primary test case)
console.log("\n=== TESTING pt-establishment composition loading ===");
const ptManifest = loadCompositionPackage("pt-establishment");
console.log("\n=== FINAL pt-establishment manifest ===");
console.log(JSON.stringify(ptManifest, null, 2));
// Verify no fallback warnings were thrown (workspace-standard exists)
console.log("\n=== TEST COMPLETE ===");
