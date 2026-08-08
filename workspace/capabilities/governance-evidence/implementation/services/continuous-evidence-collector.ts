import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { GovernanceEvidenceService } from "./governance-evidence.service.js";
import type { GovernanceConfidenceVerdict } from "../contracts/governance-evidence.contracts.js";

const { existsSync, watch, readFileSync, writeFileSync, mkdirSync } = fs;
const { dirname, resolve, join } = path;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = resolve(__dirname, "../../../..");

// Configuration untuk continuous collection
const COLLECTION_CONFIG = {
  // Interval untuk re-calculate confidence scores (5 menit)
  RECALCULATION_INTERVAL: 5 * 60 * 1000,
  // Path untuk menyimpan historical governance decisions
  HISTORY_PATH: resolve(WORKSPACE_ROOT, "capabilities/governance-evidence/evidence/history/governance-decisions.history.jsonl"),
  // Semua produk yang perlu dipantau
  PRODUCTS_TO_WATCH: [
    "ilc",
    "services-id",
    "lawyershub",
    "academic"
  ],
  // Log path untuk audit trail
  LOG_PATH: resolve(WORKSPACE_ROOT, "capabilities/governance-evidence/evidence/logs/collection.log")
};

// Ensure directories exist
function initDirectories(): void {
  const historyDir = dirname(COLLECTION_CONFIG.HISTORY_PATH);
  const logDir = dirname(COLLECTION_CONFIG.LOG_PATH);
  
  if (!existsSync(historyDir)) mkdirSync(historyDir, { recursive: true });
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
}

// Simple logger untuk audit trail
function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  writeFileSync(COLLECTION_CONFIG.LOG_PATH, logMessage, { flag: 'a' });
}

// Save decisions to history
function saveDecisionHistory(decisions: GovernanceConfidenceVerdict[]): void {
  const entry = {
    timestamp: new Date().toISOString(),
    decisions: decisions.map(d => ({
      capability_id: d.capability_id,
      confidence_score: d.confidence_score,
      decision: d.decision,
      evidence_met: d.evidence_met.length,
      evidence_missing: d.evidence_missing.length
    }))
  };
  writeFileSync(COLLECTION_CONFIG.HISTORY_PATH, JSON.stringify(entry) + '\n', { flag: 'a' });
  log(`Saved decision history: ${decisions.filter(d => d.decision === "PASS").length} PASS capabilities`);
}

// Watch untuk perubahan pada semua runtime-invocations.jsonl
function setupFileWatches(service: GovernanceEvidenceService): void {
  COLLECTION_CONFIG.PRODUCTS_TO_WATCH.forEach(product => {
    const evidencePath = resolve(WORKSPACE_ROOT, `products/${product}/evidence/verification/runtime-invocations.jsonl`);
    
    if (existsSync(evidencePath)) {
      watch(evidencePath, (eventType) => {
        if (eventType === 'change') {
          log(`Runtime evidence updated for ${product}, recalculating governance decisions...`);
          try {
            const newDecisions = service.getGovernanceDecisions();
            saveDecisionHistory(newDecisions);
            log(`✅ Governance decisions recalculated successfully`);
          } catch (e) {
            log(`❌ Error recalculating decisions: ${e}`);
          }
        }
      });
      log(`Started watching ${product} runtime evidence file`);
    } else {
      log(`⚠️ Runtime evidence file not found for ${product}: ${evidencePath}`);
    }
  });
}

// Periodic recalculation even if no file changes (for scheduled health checks)
function startPeriodicRecalculation(service: GovernanceEvidenceService): void {
  setInterval(() => {
    log(`Running scheduled health check...`);
    try {
      const decisions = service.getGovernanceDecisions();
      saveDecisionHistory(decisions);
      const passCount = decisions.filter(d => d.decision === "PASS").length;
      log(`📊 Scheduled check complete: ${passCount}/${decisions.length} capabilities PASS`);
    } catch (e) {
      log(`❌ Scheduled health check failed: ${e}`);
    }
  }, COLLECTION_CONFIG.RECALCULATION_INTERVAL);
}

// Main entry point
function main(): void {
  initDirectories();
  log("🚀 B7.17.4 Continuous Evidence Collection Pipeline started");
  
  const service = new GovernanceEvidenceService();
  
  // Initial calculation
  try {
    const initialDecisions = service.getGovernanceDecisions();
    saveDecisionHistory(initialDecisions);
    log(`✅ Initial governance decisions calculated`);
  } catch (e) {
    log(`❌ Initial calculation failed: ${e}`);
    process.exit(1);
  }
  
  // Setup watches dan periodic checks
  setupFileWatches(service);
  startPeriodicRecalculation(service);
  
  log("✅ All collection pipelines active");
}

// Jalankan jika dieksekusi langsung
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export const ContinuousEvidenceCollector = { main, initDirectories, log, saveDecisionHistory };