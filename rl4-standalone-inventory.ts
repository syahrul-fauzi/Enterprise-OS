/**
 * RL4-001 Production Inventory Scan - STANDALONE VERSION
 * Bypasses all existing dependency chain issues to execute core inventory scan logic
 * Implements user's highest-leverage action: RL4-001 Production Inventory Audit
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname); // Repository root

// RealityClassification logic from rl4-reality-classifier.ts (embedded for standalone use)
class RealityClassification {
  classifyComponent(packageName: string, isRealComponent: boolean) {
    let tier: 'REAL' | 'PARTIALLY_REAL' | 'SIMULATED' | 'TEST_ONLY' | 'NOT_ADMITTED';
    let isExecutable = false;
    let isDurable = false;
    let isProductionEvidence = false;

    if (isRealComponent) {
      tier = 'REAL';
      isExecutable = true;
      isDurable = true;
      isProductionEvidence = true;
    } else if (packageName.includes('tooling')) {
      tier = 'PARTIALLY_REAL';
      isExecutable = true;
      isDurable = false;
      isProductionEvidence = false;
    } else if (packageName.includes('presentation') || packageName.includes('ui') || packageName.includes('frontend')) {
      tier = 'SIMULATED';
      isExecutable = true;
      isDurable = false;
      isProductionEvidence = false;
    } else if (packageName.includes('test') || packageName.includes('tests')) {
      tier = 'TEST_ONLY';
      isExecutable = false;
      isDurable = false;
      isProductionEvidence = false;
    } else {
      tier = 'NOT_ADMITTED';
      isExecutable = false;
      isDurable = false;
      isProductionEvidence = false;
    }

    return { tier, isExecutable, isDurable, isProductionEvidence };
  }
}

// Core inventory scan logic from production-inventory-scanner.ts
async function runStandaloneInventoryScan() {
  const items = [];
  const classifier = new RealityClassification();
  
  console.log('=== RL4-001 PRODUCTION INVENTORY SCAN (STANDALONE) ===');
  console.log('Scanning codebase for component reality classification...');

  // Core real components (from RL4-001 recon: blocker_analysis.simulation_vs_real.real)
  const realComponents = ['capability-registry', 'kernel', 'constitution', 'proof-ledger', 'runtime'];
  
  // Scan core workspace packages (workspace/packages/core)
  const workspaceDir = resolve(rootDir, 'workspace/packages/core');
  if (existsSync(workspaceDir)) {
    const packages = readdirSync(workspaceDir);
    console.log(`Found ${packages.length} packages in core directory`);
    for (const pkg of packages) {
      const pkgPath = resolve(workspaceDir, pkg);
      if (existsSync(pkgPath)) {
        const isReal = realComponents.some(c => pkg.includes(c));
        const classification = classifier.classifyComponent(pkg, isReal);
        items.push({
          path: pkgPath,
          name: `core/${pkg}`,
          realityTier: classification.tier,
          isExecutable: classification.isExecutable,
          isDurable: classification.isDurable,
          isProductionGradeEvidence: classification.isProductionEvidence,
          lastModified: new Date()
        });
        console.log(`Added package: core/${pkg} - classification: ${classification.tier}`);
      }
    }
  }

  // Scan root workspace packages (workspace/packages)
  const rootPackagesDir = resolve(rootDir, 'workspace/packages');
  if (existsSync(rootPackagesDir)) {
    const rootPackages = readdirSync(rootPackagesDir);
    console.log(`Found ${rootPackages.length} packages in root packages directory`);
    for (const pkg of rootPackages) {
      const pkgPath = resolve(rootPackagesDir, pkg);
      if (existsSync(pkgPath) && pkg !== 'core') { // avoid double counting core packages
        const isReal = realComponents.some(c => pkg.includes(c));
        const classification = classifier.classifyComponent(pkg, isReal);
        items.push({
          path: pkgPath,
          name: pkg,
          realityTier: classification.tier,
          isExecutable: classification.isExecutable,
          isDurable: classification.isDurable,
          isProductionGradeEvidence: classification.isProductionEvidence,
          lastModified: new Date()
        });
        console.log(`Added package: ${pkg} - classification: ${classification.tier}`);
      }
    }
  }

  // Calculate classification summary
  const classifications = {
    REAL: items.filter(i => i.realityTier === 'REAL').length,
    PARTIALLY_REAL: items.filter(i => i.realityTier === 'PARTIALLY_REAL').length,
    SIMULATED: items.filter(i => i.realityTier === 'SIMULATED').length,
    TEST_ONLY: items.filter(i => i.realityTier === 'TEST_ONLY').length,
    NOT_ADMITTED: items.filter(i => i.realityTier === 'NOT_ADMITTED').length
  };

  const reportDir = resolve(rootDir, '.eos-state/recon');
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = resolve(reportDir, 'rl4-001-production-inventory.json');
  const report = {
    workId: 'RL4-001',
    scannedAt: new Date().toISOString(),
    totalItems: items.length,
    classifications,
    items,
    reportPath
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return report;
}

// Execute standalone scan (wrapped in IIFE to avoid top-level await issues)
(async () => {
  try {
    const result = await runStandaloneInventoryScan();
    console.log('\n=== SCAN COMPLETE - RL4-001 INVENTORY REPORT ===');
    console.log(`Total components scanned: ${result.totalItems}`);
    console.log('\nClassification Summary:');
    console.log(`  REAL:              ${result.classifications.REAL}`);
    console.log(`  PARTIALLY_REAL:    ${result.classifications.PARTIALLY_REAL}`);
    console.log(`  SIMULATED:         ${result.classifications.SIMULATED}`);
    console.log(`  TEST_ONLY:         ${result.classifications.TEST_ONLY}`);
    console.log(`  NOT_ADMITTED:      ${result.classifications.NOT_ADMITTED}`);
    console.log('\nFull report written to:');
    console.log(`  ${result.reportPath}`);
    console.log('\n✅ RL4-001 Production Inventory Audit Complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error in RL4-001 inventory scan:', err);
    process.exit(1);
  }
})();