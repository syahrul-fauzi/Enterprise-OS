"use strict";
/**
 * RL4-001 Production Inventory Scan - STANDALONE VERSION
 * Bypasses all existing dependency chain issues to execute core inventory scan logic
 * Implements user's highest-leverage action: RL4-001 Production Inventory Audit
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const url_1 = require("url");
const __dirname = (0, url_1.fileURLToPath)(new URL('.', import.meta.url));
const rootDir = (0, path_1.resolve)(__dirname); // Repository root
// RealityClassification logic from rl4-reality-classifier.ts (embedded for standalone use)
class RealityClassification {
    classifyComponent(packageName, isRealComponent) {
        let tier;
        let isExecutable = false;
        let isDurable = false;
        let isProductionEvidence = false;
        if (isRealComponent) {
            tier = 'REAL';
            isExecutable = true;
            isDurable = true;
            isProductionEvidence = true;
        }
        else if (packageName.includes('tooling')) {
            tier = 'PARTIALLY_REAL';
            isExecutable = true;
            isDurable = false;
            isProductionEvidence = false;
        }
        else if (packageName.includes('presentation') || packageName.includes('ui') || packageName.includes('frontend')) {
            tier = 'SIMULATED';
            isExecutable = true;
            isDurable = false;
            isProductionEvidence = false;
        }
        else if (packageName.includes('test') || packageName.includes('tests')) {
            tier = 'TEST_ONLY';
            isExecutable = false;
            isDurable = false;
            isProductionEvidence = false;
        }
        else {
            tier = 'NOT_ADMITTED';
            isExecutable = false;
            isDurable = false;
            isProductionEvidence = false;
        }
        return { tier, isExecutable, isDurable, isProductionEvidence };
    }
}
// Core inventory scan logic from production-inventory-scanner.ts
function runStandaloneInventoryScan() {
    return __awaiter(this, void 0, void 0, function* () {
        const items = [];
        const classifier = new RealityClassification();
        console.log('=== RL4-001 PRODUCTION INVENTORY SCAN (STANDALONE) ===');
        console.log('Scanning codebase for component reality classification...');
        // Core real components (from RL4-001 recon: blocker_analysis.simulation_vs_real.real)
        const realComponents = ['capability-registry', 'kernel', 'constitution', 'proof-ledger', 'runtime'];
        // Scan core workspace packages (workspace/packages/core)
        const workspaceDir = (0, path_1.resolve)(rootDir, 'workspace/packages/core');
        if ((0, fs_1.existsSync)(workspaceDir)) {
            const packages = (0, fs_1.readdirSync)(workspaceDir);
            console.log(`Found ${packages.length} packages in core directory`);
            for (const pkg of packages) {
                const pkgPath = (0, path_1.resolve)(workspaceDir, pkg);
                if ((0, fs_1.existsSync)(pkgPath)) {
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
        const rootPackagesDir = (0, path_1.resolve)(rootDir, 'workspace/packages');
        if ((0, fs_1.existsSync)(rootPackagesDir)) {
            const rootPackages = (0, fs_1.readdirSync)(rootPackagesDir);
            console.log(`Found ${rootPackages.length} packages in root packages directory`);
            for (const pkg of rootPackages) {
                const pkgPath = (0, path_1.resolve)(rootPackagesDir, pkg);
                if ((0, fs_1.existsSync)(pkgPath) && pkg !== 'core') { // avoid double counting core packages
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
        const reportDir = (0, path_1.resolve)(rootDir, '.eos-state/recon');
        if (!(0, fs_1.existsSync)(reportDir)) {
            (0, fs_1.mkdirSync)(reportDir, { recursive: true });
        }
        const reportPath = (0, path_1.resolve)(reportDir, 'rl4-001-production-inventory.json');
        const report = {
            workId: 'RL4-001',
            scannedAt: new Date().toISOString(),
            totalItems: items.length,
            classifications,
            items,
            reportPath
        };
        (0, fs_1.writeFileSync)(reportPath, JSON.stringify(report, null, 2));
        return report;
    });
}
// Execute standalone scan (wrapped in IIFE to avoid top-level await issues)
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield runStandaloneInventoryScan();
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
    }
    catch (err) {
        console.error('❌ Fatal error in RL4-001 inventory scan:', err);
        process.exit(1);
    }
}))();
