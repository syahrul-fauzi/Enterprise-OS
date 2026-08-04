import { createHash } from "node:crypto";

import {
  materializeGateCAcceptanceBundle,
  materializeGateCCapabilityBundle,
  materializeGateCDecisionBundle,
  materializeGateCFoundationBundle,
  materializeGateCGovernanceBundle,
  materializeGateCLearningBundle,
  materializeGateCSpecificationBundle,
  materializeGateCStatusBundle,
  materializeGateCTrustBundle,
  type GateCAcceptanceBundle,
  type GateCCapabilityBundle,
  type GateCDecisionBundle,
  type GateCFoundationBundle,
  type GateCGovernanceBundle,
  type GateCLearningBundle,
  type GateCSpecificationBundle,
  type GateCStatusBundle,
  type GateCTrustBundle,
} from "../bundles/index.js";
import {
  readGateCGovernancePlatformReadModel,
  type GateCArtifactReaderContext,
} from "../runtime/readers/governance-platform-reader.js";
import {
  readGateCProjectionSourceReadModel,
  type GateCProjectionSourceReadModel,
} from "../runtime/readers/projection-source-reader.js";

export type GateCProjectionBundle = Readonly<{
  acceptance: GateCAcceptanceBundle;
  governance: GateCGovernanceBundle;
  trust: GateCTrustBundle;
  capability: GateCCapabilityBundle;
  specification: GateCSpecificationBundle;
  decision: GateCDecisionBundle;
  learning: GateCLearningBundle;
  foundation: GateCFoundationBundle;
  status: GateCStatusBundle;
}>;

export function loadGateCProjectionBundle(
  context: GateCArtifactReaderContext,
): GateCProjectionBundle {
  const governancePlatform = readGateCGovernancePlatformReadModel(context);
  const projectionSource = readGateCProjectionSourceReadModel(context);
  const governance = materializeGateCGovernanceBundle({
    platform: governancePlatform.snapshot,
    evidenceRefs: governancePlatform.refs,
  });
  const projectionSourceSnapshotHash = hashProjectionSourceSnapshot(
    projectionSource.snapshot,
  );
  return {
    acceptance: materializeGateCAcceptanceBundle(projectionSource.snapshot),
    governance,
    trust: materializeGateCTrustBundle(governancePlatform.snapshot),
    capability: materializeGateCCapabilityBundle(governancePlatform.snapshot),
    specification: materializeGateCSpecificationBundle(
      governancePlatform.snapshot,
    ),
    decision: materializeGateCDecisionBundle(governancePlatform.snapshot),
    learning: materializeGateCLearningBundle(governancePlatform.snapshot),
    foundation: materializeGateCFoundationBundle(governancePlatform.snapshot),
    status: materializeGateCStatusBundle({
      governance,
      sourceEvidence: projectionSource.snapshot,
      sourceEvidenceHash: projectionSourceSnapshotHash,
    }),
  };
}

function hashProjectionSourceSnapshot(
  snapshot: GateCProjectionSourceReadModel["snapshot"],
): string {
  const sortedEntries = Object.entries(snapshot).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const canonicalJson = JSON.stringify(Object.fromEntries(sortedEntries));
  return `sha256:${createSha256(canonicalJson)}`;
}

function createSha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
