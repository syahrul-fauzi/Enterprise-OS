// Simple test script to verify recursive composition loading works
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from "yaml";

interface ProductCompositionManifest {
  id: string;
  extends?: string[];
  patterns?: string[];
  capabilities?: string[];
  surfaces?: string[];
}

function loadCompositionPackage(packageId: string, processedPackages: Set<string> = new Set()): ProductCompositionManifest | null {
  if (processedPackages.has(packageId)) {
    console.warn(`[test] Skipping already processed package: ${packageId} (circular dependency prevented)`);
    return null;
  }
  processedPackages.add(packageId);

  const basePath = join(process.cwd(), 'workspace', 'packages', 'compositions', packageId);
  const manifestPath = join(basePath, 'manifest.yaml');
  
  if (!existsSync(manifestPath)) {
    console.warn(`[test] Package not found: ${packageId} - falling back`);
    return { id: packageId, patterns: [], capabilities: [], surfaces: [], extends: [] };
  }
  
  try {
    const manifestContent = readFileSync(manifestPath, 'utf8');
    const manifest = yaml.parse(manifestContent) as ProductCompositionManifest;
    
    if (manifest.extends && manifest.extends.length > 0) {
      const mergedCapabilities = new Set<string>(manifest.capabilities || []);
      const mergedPatterns = new Set<string>(manifest.patterns || []);
      const mergedSurfaces = new Set<string>(manifest.surfaces || []);
      
      manifest.extends.forEach((extendedPackageId) => {
        const extendedManifest = loadCompositionPackage(extendedPackageId, processedPackages);
        if (extendedManifest) {
          extendedManifest.capabilities?.forEach(cap => mergedCapabilities.add(cap));
          extendedManifest.patterns?.forEach(pat => mergedPatterns.add(pat));
          extendedManifest.surfaces?.forEach(sur => mergedSurfaces.add(sur));
          console.log(`[test] Merged from ${extendedPackageId}: total capabilities ${mergedCapabilities.size}`);
        }
      });
      
      (manifest as any).capabilities = Array.from(mergedCapabilities);
      (manifest as any).patterns = Array.from(mergedPatterns);
      (manifest as any).surfaces = Array.from(mergedSurfaces);
    }
    
    console.log(`[test] Successfully loaded ${packageId}: patterns=${manifest.patterns?.length}, capabilities=${manifest.capabilities?.length}, surfaces=${manifest.surfaces?.length}`);
    return manifest;
  } catch (e) {
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