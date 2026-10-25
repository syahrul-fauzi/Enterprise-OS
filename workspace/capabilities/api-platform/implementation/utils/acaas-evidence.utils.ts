// ACaaS-COMMERCIAL-001: Wrapper untuk canonical safeRecordEvidence dari work-core (tidak lagi local copy)
// Gate A requirement: hapus semua duplikat safeRecordEvidence, gunakan canonical dari work-core
import type { WorkspaceId, EvidenceBoundary } from "@capabilities/work-core/contracts/work.contracts";
import { validateBoundaryAccess, safeRecordEvidence } from "@capabilities/work-core/implementation/utils/evidence.utils.js";

export async function safeRecordEvidenceACaaS(payload: {
  workspace_id?: WorkspaceId | undefined;
  capability: string;
  command: string;
  work_id: string;
  tenant_id: string;
  actor_id: string;
  timestamp: string;
  sessionId: string; // Wajib sesuai kontrak canonical safeRecordEvidence
  [key: string]: unknown;
}): Promise<{ readonly ok: boolean }> {
  try {
    // 1. Validate EvidenceBoundary compliance sebelum memproses payload (spesifik untuk ACAAS boundary)
    const hasValidAccess = validateBoundaryAccess("acaas", "evidence-gateway");
    if (!hasValidAccess) {
      throw new Error("[ACAAS-EVIDENCE] Invalid domain access: acaas cannot access evidence-gateway directly (violates boundary rules)");
    }

    // 2. Panggil canonical safeRecordEvidence dari work-core - semua logika SHA-256, fallback, dan durability sudah terhandle
    return await safeRecordEvidence(payload);
  } catch (_e) {
    console.warn(`[ACAAS-EVIDENCE] Failed to record evidence via canonical work-core implementation: ${(_e as Error).message}`);
    return { ok: false };
  }
}