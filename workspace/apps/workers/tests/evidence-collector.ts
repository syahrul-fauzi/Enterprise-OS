import * as fs from "fs/promises";
import * as path from "path";

export async function collectEvidence(testResults: any[]) {
  // Gunakan canonical evidence path sesuai EOS War Room: /.eos-state/evidence/FIN-001-W2/
  const evidenceDir = path.join("/root/Enterprise-OS", ".eos-state", "evidence", "FIN-001-W2");
  await fs.mkdir(evidenceDir, { recursive: true });
  
  const evidencePath = path.join(evidenceDir, `WORKER-001_test-results-${Date.now()}.json`);
  await fs.writeFile(evidencePath, JSON.stringify({
    completedAt: new Date().toISOString(),
    workId: "WORKER-001",
    scope: "FIN-001-W2",
    results: testResults,
    workerVersion: process.env.APP_VERSION || "1.0.0"
  }, null, 2));
  console.log(`[EvidenceCollector] Evidence saved to canonical EOS path: ${evidencePath}`);
}