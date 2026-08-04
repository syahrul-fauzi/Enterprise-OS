import { executeArtifactReaderRegistry } from "./artifact-reader.js";
import {
  GATE_C_GOVERNANCE_PLATFORM_READER,
  type GateCArtifactReaderContext,
} from "./governance-platform-reader.js";
import { GATE_C_PROJECTION_SOURCE_READER } from "./projection-source-reader.js";

export function executeGateCArtifactReaderRegistry(
  context: GateCArtifactReaderContext,
) {
  return executeArtifactReaderRegistry({
    context,
    readers: {
      governancePlatform: GATE_C_GOVERNANCE_PLATFORM_READER,
      projectionSource: GATE_C_PROJECTION_SOURCE_READER,
    },
  });
}

export type GateCArtifactReaderRegistryResult = ReturnType<
  typeof executeGateCArtifactReaderRegistry
>;

export type { GateCArtifactReaderContext } from "./governance-platform-reader.js";
