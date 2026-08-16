export * from "./types";
export type * from "./interfaces";
export * from "./schema";
export * from "./verification-decision";
export * from "./verification-proof";
export * from "./artifact-graph";
export * from "./delivery-evidence";
export type {
  TransformationProofEntry,
  ExecutionProofEntry,
  RepositoryProofEntry,
  ProofLedgerDocument,
} from "./interfaces";
export type {
  VerificationDecisionSnapshot,
  DecisionEvidenceRecord,
} from "./verification-decision";
export type {
  VerificationProofObject,
} from "./verification-proof";
export type {
  RequirementArtifactGraph,
  ArtifactNode,
  ArtifactEdge,
} from "./artifact-graph";
export type {
  PersistedDeliveryEvidence,
} from "./delivery-evidence";

export const PROOF_LEDGER_ID = "PROOF-LEDGER-V1";
export const PROOF_LEDGER_VERSION = "1.0.0";
export const PROOF_LEDGER_GENESIS_HASH = "sha256:0000000000000000000000000000000000000000000000000000000000000000";

export const PROOF_LEVEL_ORDER: readonly [
  "TRANSFORMATION_PROOF",
  "EXECUTION_PROOF",
  "REPOSITORY_PROOF",
] = ["TRANSFORMATION_PROOF", "EXECUTION_PROOF", "REPOSITORY_PROOF"] as const;

export const validateLevelDependency = (
  emittedLevel: "TRANSFORMATION_PROOF" | "EXECUTION_PROOF" | "REPOSITORY_PROOF",
  lowerLevelVerdict: "PASS" | "FAIL" | "INCONCLUSIVE" | "UNRESOLVED",
): boolean => {
  if (emittedLevel === "EXECUTION_PROOF") return lowerLevelVerdict === "PASS";
  if (emittedLevel === "REPOSITORY_PROOF") return lowerLevelVerdict === "PASS";
  return true;
};

export const isAppendOnlyValid = (
  oldCount: number,
  newEntries: unknown[],
  preservedHead: unknown[],
): boolean => preservedHead.length === oldCount;