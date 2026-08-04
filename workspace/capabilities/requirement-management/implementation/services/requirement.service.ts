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
import { RequirementRepositoryCurrent } from "../repository";
import { recordRuntimeInvocation } from "@repo/core-runtime";

export class RequirementService {
  readonly repositories = { Requirement: RequirementRepositoryCurrent } as const;

  createRequirement(input: CreateRequirementInput): CreateRequirementOutput {
    const result = createRequirement.execute(input) as CreateRequirementOutput;
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "create-requirement",
      sourceRef: "RequirementService.createRequirement",
      success: true,
      input,
      result,
    });
    return result;
  }

  updateRequirement(input: UpdateRequirementInput): UpdateRequirementOutput {
    const result = updateRequirement.execute(input) as UpdateRequirementOutput;
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "update-requirement",
      sourceRef: "RequirementService.updateRequirement",
      success: true,
      input,
      result,
    });
    return result;
  }

  approveRequirement(input: ApproveRequirementInput): ApproveRequirementOutput {
    const result = approveRequirement.execute(input) as ApproveRequirementOutput;
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "approve-requirement",
      sourceRef: "RequirementService.approveRequirement",
      success: true,
      input,
      result,
    });
    return result;
  }

  startRequirementDelivery(
    input: StartRequirementDeliveryInput,
  ): StartRequirementDeliveryOutput {
    const result = startRequirementDelivery.execute(input) as StartRequirementDeliveryOutput;
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "start-requirement-delivery",
      sourceRef: "RequirementService.startRequirementDelivery",
      success: true,
      input,
      result,
    });
    return result;
  }

  markRequirementImplemented(
    input: MarkRequirementImplementedInput,
  ): MarkRequirementImplementedOutput {
    const result = markRequirementImplemented.execute(input) as MarkRequirementImplementedOutput;
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "mark-requirement-implemented",
      sourceRef: "RequirementService.markRequirementImplemented",
      success: true,
      input,
      result,
    });
    return result;
  }

  verifyRequirement(input: VerifyRequirementInput): VerifyRequirementOutput {
    const result = verifyRequirement.execute(input) as VerifyRequirementOutput;
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "verify-requirement",
      sourceRef: "RequirementService.verifyRequirement",
      success: true,
      input,
      result,
    });
    return result;
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
    return RequirementRepositoryCurrent.list();
  }
}

export const requirementService = new RequirementService();

export * from "../contracts";
export * from "../commands";
export * from "../queries";
export * from "../repository";
