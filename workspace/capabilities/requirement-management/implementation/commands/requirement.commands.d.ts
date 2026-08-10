import type { CapabilityCommand } from "@repo/core-kernel";
import { type ApproveRequirementInput, type ApproveRequirementOutput, type CreateRequirementInput, type CreateRequirementOutput, type MarkRequirementImplementedInput, type MarkRequirementImplementedOutput, type StartRequirementDeliveryInput, type StartRequirementDeliveryOutput, type UpdateRequirementInput, type UpdateRequirementOutput, type VerifyRequirementInput, type VerifyRequirementOutput } from "../contracts";
type CreateRequirementCommand = CapabilityCommand<CreateRequirementInput, CreateRequirementOutput>;
type UpdateRequirementCommand = CapabilityCommand<UpdateRequirementInput, UpdateRequirementOutput>;
type ApproveRequirementCommand = CapabilityCommand<ApproveRequirementInput, ApproveRequirementOutput>;
type StartRequirementDeliveryCommand = CapabilityCommand<StartRequirementDeliveryInput, StartRequirementDeliveryOutput>;
type MarkRequirementImplementedCommand = CapabilityCommand<MarkRequirementImplementedInput, MarkRequirementImplementedOutput>;
type VerifyRequirementCommand = CapabilityCommand<VerifyRequirementInput, VerifyRequirementOutput>;
export declare const createRequirement: CreateRequirementCommand;
export declare const updateRequirement: UpdateRequirementCommand;
export declare const approveRequirement: ApproveRequirementCommand;
export declare const startRequirementDelivery: StartRequirementDeliveryCommand;
export declare const markRequirementImplemented: MarkRequirementImplementedCommand;
export declare const verifyRequirement: VerifyRequirementCommand;
export declare const requirementCommands: Readonly<Record<string, CapabilityCommand>>;
export {};
//# sourceMappingURL=requirement.commands.d.ts.map