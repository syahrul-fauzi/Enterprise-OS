import type { GateCGovernanceBundle } from "./governance.js";
import type { GateCProjectionSourceSnapshot } from "../read-models/status-snapshot.js";

export type GateCStatusBundle = Readonly<{
  projection: Readonly<{
    governance: GateCGovernanceBundle;
    sourceEvidence: GateCProjectionSourceSnapshot;
    sourceEvidenceHash: string;
  }>;
}>;

export function materializeGateCStatusBundle(input: {
  readonly governance: GateCGovernanceBundle;
  readonly sourceEvidence: GateCProjectionSourceSnapshot;
  readonly sourceEvidenceHash: string;
}): GateCStatusBundle {
  return {
    projection: {
      governance: input.governance,
      sourceEvidence: input.sourceEvidence,
      sourceEvidenceHash: input.sourceEvidenceHash,
    },
  };
}
