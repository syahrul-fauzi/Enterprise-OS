import type { GateCGovernancePlatformSnapshot } from "../read-models/status-snapshot.js";

export type GateCFoundationBundle = Readonly<{
  verificationRun: Readonly<{
    hash: string | null;
    verificationHash: string | null;
    status: string;
    runId: string | null;
    readinessStatus: string | null;
  }>;
  evidenceProducers: Readonly<{
    convergenceHash: string | null;
    convergenceStatus: string;
    producerCount: number | null;
    targetCount: number | null;
    registeredTargetCount: number | null;
    targetCoverageRatio: number | null;
  }>;
}>;

export function materializeGateCFoundationBundle(
  snapshot: GateCGovernancePlatformSnapshot,
): GateCFoundationBundle {
  return {
    verificationRun: {
      hash: snapshot.verification_run_hash,
      verificationHash: snapshot.verification_run_verification_hash,
      status: snapshot.verification_run_status,
      runId: snapshot.verification_run_id,
      readinessStatus: snapshot.verification_run_readiness_status,
    },
    evidenceProducers: {
      convergenceHash: snapshot.evidence_producer_convergence_hash,
      convergenceStatus: snapshot.evidence_producer_convergence_status,
      producerCount: snapshot.evidence_producer_count,
      targetCount: snapshot.evidence_producer_target_count,
      registeredTargetCount:
        snapshot.evidence_producer_registered_target_count,
      targetCoverageRatio: snapshot.evidence_producer_target_coverage_ratio,
    },
  };
}
