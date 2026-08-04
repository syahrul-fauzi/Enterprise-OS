import { join, relative } from "node:path";

import {
  buildProjectionSourceSnapshotRuntime,
  type GateCProjectionSourceSnapshot,
  type GateCProjectionSourceSnapshotPaths,
} from "../../read-models/status-snapshot.js";
import type { ArtifactReader } from "./artifact-reader.js";
import {
  resolveGateCGovernanceSnapshotPaths,
  type GateCArtifactReaderContext,
} from "./governance-platform-reader.js";
import { EOS_ROOT } from "../../../state.js";

export type GateCProjectionSourceEvidenceRefs = Readonly<{
  acceptanceDir: string;
  coverageMatrix: string;
  proofLedger: string;
  acceptanceContract: string;
  acceptanceDecisions: string;
}>;

export type GateCProjectionSourceReadModel = Readonly<{
  snapshot: GateCProjectionSourceSnapshot;
  refs: GateCProjectionSourceEvidenceRefs;
}>;

export function resolveGateCProjectionSourceSnapshotPaths(
  context: GateCArtifactReaderContext,
): GateCProjectionSourceSnapshotPaths {
  return {
    acceptanceDir: join(context.gateExecutionDir, "acceptance"),
    coverageMatrixPath: join(context.gateExecutionDir, "coverage-matrix.yaml"),
    runProofLedgerPath: join(context.gateExecutionDir, "proof-ledger.yaml"),
    acceptanceContractPath: join(
      context.gateExecutionDir,
      "acceptance-contract.yaml",
    ),
    acceptanceDecisionsPath: join(
      context.gateExecutionDir,
      "acceptance-decisions.yaml",
    ),
    ...resolveGateCGovernanceSnapshotPaths(context),
  };
}

export const GATE_C_PROJECTION_SOURCE_READER: ArtifactReader<
  GateCArtifactReaderContext,
  GateCProjectionSourceSnapshot
> = {
  id: "projection-source-reader",
  read(context) {
    return buildProjectionSourceSnapshotRuntime({
      paths: resolveGateCProjectionSourceSnapshotPaths(context),
    });
  },
};

export function readGateCProjectionSourceSnapshot(
  context: GateCArtifactReaderContext,
): GateCProjectionSourceSnapshot {
  return GATE_C_PROJECTION_SOURCE_READER.read(context);
}

export function resolveGateCProjectionSourceEvidenceRefs(
  context: GateCArtifactReaderContext,
): GateCProjectionSourceEvidenceRefs {
  const paths = resolveGateCProjectionSourceSnapshotPaths(context);
  return {
    acceptanceDir: toRepoRelative(paths.acceptanceDir),
    coverageMatrix: toRepoRelative(paths.coverageMatrixPath),
    proofLedger: toRepoRelative(paths.runProofLedgerPath),
    acceptanceContract: toRepoRelative(paths.acceptanceContractPath),
    acceptanceDecisions: toRepoRelative(paths.acceptanceDecisionsPath),
  };
}

export const GATE_C_PROJECTION_SOURCE_READ_MODEL_READER: ArtifactReader<
  GateCArtifactReaderContext,
  GateCProjectionSourceReadModel
> = {
  id: "projection-source-read-model-reader",
  read(context) {
    return {
      snapshot: readGateCProjectionSourceSnapshot(context),
      refs: resolveGateCProjectionSourceEvidenceRefs(context),
    };
  },
};

export function readGateCProjectionSourceReadModel(
  context: GateCArtifactReaderContext,
): GateCProjectionSourceReadModel {
  return GATE_C_PROJECTION_SOURCE_READ_MODEL_READER.read(context);
}

function toRepoRelative(path: string): string {
  return relative(EOS_ROOT, path).replaceAll("\\", "/");
}
