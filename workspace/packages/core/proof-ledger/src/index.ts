export * from "./types.js";
export type * from "./interfaces.js";
export * from "./schema.js";
export type {
  TransformationProofEntry,
  ExecutionProofEntry,
  RepositoryProofEntry,
  ProofLedgerDocument,
} from "./interfaces.js";

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
