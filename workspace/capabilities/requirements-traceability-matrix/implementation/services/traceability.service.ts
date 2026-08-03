import type {
  GetTraceabilityRowInput,
  GetTraceabilityRowOutput,
  SearchTraceabilityMatrixInput,
  SearchTraceabilityMatrixOutput,
} from "../contracts";
import { traceabilityQueries } from "../queries";
import { TraceabilityArtifactRepositoryInMemory } from "../repository";
import { recordRuntimeInvocation } from "@repo/core-runtime";

export class RequirementsTraceabilityMatrixService {
  readonly repositories = {
    TraceabilityArtifact: TraceabilityArtifactRepositoryInMemory,
  } as const;

  getTraceabilityRow(input: GetTraceabilityRowInput): GetTraceabilityRowOutput {
    const result = traceabilityQueries["traceability.get"].execute(input);
    recordRuntimeInvocation({
      capabilityId: "requirements-traceability-matrix",
      operationId: "get-traceability-row",
      sourceRef: "RequirementsTraceabilityMatrixService.getTraceabilityRow",
      success: result !== undefined,
      input,
      result: result ?? { error: "traceability_not_found", requirementId: input.requirementId },
    });
    return result;
  }

  searchTraceabilityMatrix(
    input: SearchTraceabilityMatrixInput,
  ): SearchTraceabilityMatrixOutput {
    const result = traceabilityQueries["traceability.search"].execute(input);
    recordRuntimeInvocation({
      capabilityId: "requirements-traceability-matrix",
      operationId: "search-traceability-matrix",
      sourceRef: "RequirementsTraceabilityMatrixService.searchTraceabilityMatrix",
      success: true,
      input,
      result: {
        returned: result.items.length,
        requirementCount: result.summary.requirementCount,
        completeCount: result.summary.completeCount,
      },
    });
    return result;
  }
}

export const requirementsTraceabilityMatrixService =
  new RequirementsTraceabilityMatrixService();

export * from "../contracts";
export * from "../queries";
export * from "../repository";
