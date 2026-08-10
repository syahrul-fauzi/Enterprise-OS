import { computeVerificationDecision, type VerificationDecisionSnapshot } from "./verification-decision.js";

const PROOF_SCHEMA_VERSION = "1.0.0";
const PROOF_OBJECT_KIND = "verification-decision-proof";
const PREDICATE_ID = "requirement-verification";

export interface VerificationProofObject {
  readonly schemaVersion: string;
  readonly proofKind: string;
  readonly proofId: string;
  readonly requirementId: string;
  readonly predicateId: string;
  readonly predicateVersion: string;
  readonly decision: VerificationDecisionSnapshot["verdict"];
  readonly decisionFingerprint: string;
  readonly decisionInputHash: string;
  readonly requirementHash: string;
  readonly evidenceSetHash: string;
  readonly registryProjectionHash: string;
  readonly proofDigest: string;
  readonly evaluatedAt: string;
  readonly provenance: {
    readonly consultedPersistedVerificationState: boolean;
    readonly lifecycleEligible: boolean;
    readonly evidencePaths: readonly string[];
    readonly evidenceIds: readonly string[];
    readonly registryRequirementRefs: readonly string[];
    readonly registryKindBreakdown: Readonly<Record<string, number>>;
  };
}

function buildProofIdentityInput(decision: VerificationDecisionSnapshot) {
  return {
    schemaVersion: PROOF_SCHEMA_VERSION,
    proofKind: PROOF_OBJECT_KIND,
    predicateId: PREDICATE_ID,
    predicateVersion: decision.predicateVersion,
    requirementId: decision.requirementId,
    requirementHash: decision.requirementHash,
    evidenceSetHash: decision.evidenceSetHash,
    registryProjectionHash: decision.registryProjectionHash,
    decisionInputHash: decision.decisionInputHash,
    decisionFingerprint: decision.decisionFingerprint,
    decision: decision.verdict,
  } as const;
}

export function computeVerificationProofObject(requirementId: string): VerificationProofObject {
  const decision = computeVerificationDecision(requirementId);
  const proofIdentityInput = buildProofIdentityInput(decision);
  const proofDigest = DigestEngine.digest(proofIdentityInput);

  return {
    schemaVersion: PROOF_SCHEMA_VERSION,
    proofKind: PROOF_OBJECT_KIND,
    proofId: `${PROOF_OBJECT_KIND}:${decision.requirementId}:${proofDigest.slice(0, 16)}`,
    requirementId: decision.requirementId,
    predicateId: PREDICATE_ID,
    predicateVersion: decision.predicateVersion,
    decision: decision.verdict,
    decisionFingerprint: decision.decisionFingerprint,
    decisionInputHash: decision.decisionInputHash,
    requirementHash: decision.requirementHash,
    evidenceSetHash: decision.evidenceSetHash,
    registryProjectionHash: decision.registryProjectionHash,
    proofDigest,
    evaluatedAt: new Date().toISOString(),
    provenance: {
      consultedPersistedVerificationState: decision.consultedPersistedVerificationState,
      lifecycleEligible: decision.lifecycleEligible,
      evidencePaths: decision.evidenceSet.map((item) => item.path),
      evidenceIds: decision.evidenceSet.map((item) => item.id),
      registryRequirementRefs: [...decision.registryProjection.evidenceRequirementRefs],
      registryKindBreakdown: decision.registryProjection.kindBreakdown,
    },
  };
}