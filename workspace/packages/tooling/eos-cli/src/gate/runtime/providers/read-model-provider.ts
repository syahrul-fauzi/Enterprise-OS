import type { GateCArtifactReaderContext } from "../readers/governance-platform-reader.js";
import type { GateCGovernancePlatformReadModel } from "../readers/governance-platform-reader.js";
import type { GateCProjectionSourceReadModel } from "../readers/projection-source-reader.js";
import { readGateCGovernancePlatformReadModel } from "../readers/governance-platform-reader.js";
import { readGateCProjectionSourceReadModel } from "../readers/projection-source-reader.js";

export type GateCReadModelProviderResult = Readonly<{
  governancePlatform: GateCGovernancePlatformReadModel;
  projectionSource: GateCProjectionSourceReadModel;
}>;

export function provideGateCReadModels(
  context: GateCArtifactReaderContext,
): GateCReadModelProviderResult {
  return {
    governancePlatform: readGateCGovernancePlatformReadModel(context),
    projectionSource: readGateCProjectionSourceReadModel(context),
  };
}
