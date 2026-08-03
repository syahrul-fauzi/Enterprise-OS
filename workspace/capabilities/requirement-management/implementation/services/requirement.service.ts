import {
  type ApproveRequirementInput,
  type ApproveRequirementOutput,
  type CreateRequirementInput,
  type CreateRequirementOutput,
  type GetRequirementInput,
  type GetRequirementOutput,
  type MarkRequirementImplementedInput,
  type MarkRequirementImplementedOutput,
  RequirementAggregate,
  type SearchRequirementsInput,
  type SearchRequirementsOutput,
  type StartRequirementDeliveryInput,
  type StartRequirementDeliveryOutput,
  type UpdateRequirementInput,
  type UpdateRequirementOutput,
  type VerifyRequirementInput,
  type VerifyRequirementOutput,
} from "../contracts";
import {
  approveRequirement,
  createRequirement,
  markRequirementImplemented,
  startRequirementDelivery,
  updateRequirement,
  verifyRequirement,
} from "../commands";
import { getRequirement, searchRequirements } from "../queries";
import { RequirementRepositoryInMemory } from "../repository";
import { recordRuntimeInvocation } from "@repo/core-runtime";

export class RequirementService {
  readonly repositories = { Requirement: RequirementRepositoryInMemory } as const;

  createRequirement(input: CreateRequirementInput): CreateRequirementOutput {
    return createRequirement.execute(input) as CreateRequirementOutput;
  }

  updateRequirement(input: UpdateRequirementInput): UpdateRequirementOutput {
    return updateRequirement.execute(input) as UpdateRequirementOutput;
  }

  approveRequirement(input: ApproveRequirementInput): ApproveRequirementOutput {
    return approveRequirement.execute(input) as ApproveRequirementOutput;
  }

  startRequirementDelivery(
    input: StartRequirementDeliveryInput,
  ): StartRequirementDeliveryOutput {
    return startRequirementDelivery.execute(input) as StartRequirementDeliveryOutput;
  }

  markRequirementImplemented(
    input: MarkRequirementImplementedInput,
  ): MarkRequirementImplementedOutput {
    return markRequirementImplemented.execute(input) as MarkRequirementImplementedOutput;
  }

  verifyRequirement(input: VerifyRequirementInput): VerifyRequirementOutput {
    return verifyRequirement.execute(input) as VerifyRequirementOutput;
  }

  getRequirement(input: GetRequirementInput): GetRequirementOutput {
    const result = getRequirement.execute(input) as GetRequirementOutput;
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "get-requirement",
      sourceRef: "RequirementService.getRequirement",
      success: result !== undefined,
      input,
      result: result ?? { error: "requirement_not_found", id: input.id },
    });
    return result;
  }

  searchRequirements(input: SearchRequirementsInput): SearchRequirementsOutput {
    const result = searchRequirements.execute(input) as SearchRequirementsOutput;
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "search-requirements",
      sourceRef: "RequirementService.searchRequirements",
      success: true,
      input,
      result: {
        matched: result.matched,
        returned: result.items.length,
      },
    });
    return result;
  }

  listRequirements(): readonly RequirementAggregate[] {
    return RequirementRepositoryInMemory.list();
  }
}

export const requirementService = new RequirementService();

export * from "../contracts";
export * from "../commands";
export * from "../queries";
export * from "../repository";
