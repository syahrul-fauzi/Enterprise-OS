import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GovernanceReadModelCatalog, GovernanceReadModelLocation, GovernanceReadModelKind } from "../contracts/governance-read-model.contracts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../../');

const HISTORY_PATH = path.resolve(WORKSPACE_ROOT, 'capabilities/governance-evidence/evidence/history/governance-decisions.history.jsonl');
const EVIDENCE_PATH = path.join(WORKSPACE_ROOT, 'capabilities/governance-read-model/evidence/verification/runtime-invocations.jsonl');

const EVIDENCE_PATHS: Record<string, string> = {
  summary: path.join(WORKSPACE_ROOT, 'capabilities/governance-read-model/evidence/summary.json'),
  claims: path.join(WORKSPACE_ROOT, 'capabilities/governance-read-model/evidence/claims.json'),
  health: path.join(WORKSPACE_ROOT, 'capabilities/governance-read-model/evidence/health.json'),
  dashboard: path.join(WORKSPACE_ROOT, 'capabilities/governance-read-model/evidence/dashboard.json'),
};

class GovernanceReadModelCatalogFileSystem implements GovernanceReadModelCatalog {
  resolve(
    kind: GovernanceReadModelKind,
  ): GovernanceReadModelLocation {
    return {
      kind,
      path: EVIDENCE_PATHS[kind] || '',
    };
  }
}

export const governanceReadModelCatalog = new GovernanceReadModelCatalogFileSystem();

// Ensure evidence directory exists
function ensureEvidenceDirExists(): void {
  const dir = path.dirname(EVIDENCE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
// B7.18.1: Record runtime invocations for governance-read-model
function recordRuntimeInvocation(invocation: {
  capability_id: string;
  operation_id: string;
  sourceRef: string;
  success: boolean;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
}): void {
  ensureEvidenceDirExists();
  const line = JSON.stringify(invocation) + "\n";
  fs.appendFileSync(EVIDENCE_PATH, line);
  console.log(`[GovernanceReadModel Collector] Recorded invocation: ${invocation.operation_id} for ${invocation.capability_id}`);
}

export class GovernanceReadModelService {
  /**
   * Mengambil snapshot keputusan governance terakhir dari history.
   */
  public getLatestSnapshot(): any {
    if (!fs.existsSync(HISTORY_PATH)) {
      recordRuntimeInvocation({
        capability_id: "governance-read-model",
        operation_id: "get-latest-snapshot",
        sourceRef: "GovernanceReadModelService.getLatestSnapshot",
        success: false,
        input: {},
        result: { error: 'Governance history file not found.' }
      });
      throw new Error('Governance history file not found.');
    }

    const fileContent = fs.readFileSync(HISTORY_PATH, 'utf-8');
    const lines = fileContent.trim().split('\n');
    if (lines.length === 0) {
      recordRuntimeInvocation({
        capability_id: "governance-read-model",
        operation_id: "get-latest-snapshot",
        sourceRef: "GovernanceReadModelService.getLatestSnapshot",
        success: false,
        input: {},
        result: { error: 'History is empty.' }
      });
      return { error: 'History is empty.' };
    }

    const lastLine = lines[lines.length - 1];
    try {
      const snapshot = lastLine ? JSON.parse(lastLine) : {};
      recordRuntimeInvocation({
        capability_id: "governance-read-model",
        operation_id: "get-latest-snapshot",
        sourceRef: "GovernanceReadModelService.getLatestSnapshot",
        success: true,
        input: {},
        result: { timestamp: snapshot.timestamp }
      });
      return snapshot;
    } catch (e) {
      console.error("Failed to parse last line of history:", e);
      recordRuntimeInvocation({
        capability_id: "governance-read-model",
        operation_id: "get-latest-snapshot",
        sourceRef: "GovernanceReadModelService.getLatestSnapshot",
        success: false,
        input: {},
        result: { error: 'Failed to parse history data.' }
      });
      return { error: 'Failed to parse history data.' };
    }
  }

  /**
   * Menyediakan ringkasan kesehatan sistem.
   */
  public getSystemHealthSummary(): any {
    const snapshot = this.getLatestSnapshot();
    if (snapshot.error) {
      recordRuntimeInvocation({
        capability_id: "governance-read-model",
        operation_id: "get-system-health-summary",
        sourceRef: "GovernanceReadModelService.getSystemHealthSummary",
        success: false,
        input: {},
        result: snapshot
      });
      return snapshot;
    }

    const decisions = snapshot.decisions || [];
    const total = decisions.length;
    const pass = decisions.filter((d: any) => d.decision === 'PASS').length;
    const fail = total - pass;
    const passRate = total > 0 ? (pass / total) * 100 : 0;

    const summary = {
      timestamp: snapshot.timestamp,
      totalCapabilities: total,
      passCount: pass,
      failCount: fail,
      passRate: `${passRate.toFixed(2)}%`,
      failingCapabilities: decisions
        .filter((d: any) => d.decision !== 'PASS')
        .map((d: any) => d.capability_id),
    };

    recordRuntimeInvocation({
      capability_id: "governance-read-model",
      operation_id: "get-system-health-summary",
      sourceRef: "GovernanceReadModelService.getSystemHealthSummary",
      success: true,
      input: {},
      result: { passRate: summary.passRate, totalCapabilities: summary.totalCapabilities }
    });

    return summary;
  }

  /**
   * Implementasi interface GovernanceReadModelProvider untuk kompatibilitas
   */
  public materializeSummary(): any {
    return this.getSystemHealthSummary();
  }

  public materializeClaims(): any {
    return this.getSystemHealthSummary();
  }

  public materializeHealth(): any {
    return this.getSystemHealthSummary();
  }

  public materializeDashboard(): any {
    return this.getSystemHealthSummary();
  }
}

export const governanceReadModelService = new GovernanceReadModelService();