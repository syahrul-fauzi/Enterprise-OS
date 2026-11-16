import * as fs from "fs/promises";
import { statePath } from "@repo/eos-cli";

export async function collectEvidence(testResults: any[]) {
  const evidenceDir = statePath('evidence', 'FIN-001-W2');
  await fs.mkdir(evidenceDir, { recursive: true });
  
  const evidencePath = statePath('evidence', 'FIN-001-W2', `WORKER-001_test-results-${Date.now()}.json`);
  await fs.writeFile(evidencePath, JSON.stringify({
    completedAt: new Date().toISOString(),
    workId: "WORKER-001",
    scope: "FIN-001-W2",
    results: testResults,
    workerVersion: process.env.APP_VERSION || "1.0.0"
  }, null, 2));
  console.log(`[EvidenceCollector] Evidence saved to canonical EOS path: ${evidencePath}`);
}