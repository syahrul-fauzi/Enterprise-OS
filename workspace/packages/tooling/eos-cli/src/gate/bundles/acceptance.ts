import type { GateCProjectionSourceSnapshot } from "../read-models/status-snapshot.js";

export type GateCAcceptanceBundle = Readonly<{
  evidence: Readonly<{
    coverageMatrixHash: string;
    proofLedgerHash: string;
    acceptanceContractHash: string;
    acceptanceDecisionsHash: string | null;
    acceptanceEvidenceFileCount: number;
    acceptanceEvidenceInventoryHash: string | null;
  }>;
}>;

export function materializeGateCAcceptanceBundle(
  snapshot: GateCProjectionSourceSnapshot,
): GateCAcceptanceBundle {
  return {
    evidence: {
      coverageMatrixHash: snapshot.coverage_matrix_hash,
      proofLedgerHash: snapshot.proof_ledger_hash,
      acceptanceContractHash: snapshot.acceptance_contract_hash,
      acceptanceDecisionsHash: snapshot.acceptance_decisions_hash,
      acceptanceEvidenceFileCount: snapshot.acceptance_evidence_file_count,
      acceptanceEvidenceInventoryHash: snapshot.acceptance_evidence_inventory_hash,
    },
  };
}
