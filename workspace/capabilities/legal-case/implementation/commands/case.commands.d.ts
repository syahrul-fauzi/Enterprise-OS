import { AssignLawyerInput, AssignLawyerOutput, CaseId, CloseCaseInput, CloseCaseOutput, CreateCaseInput, CreateCaseOutput } from "../contracts";
import type { CapabilityCommand } from "@repo/core-kernel";
type CreateCaseCommand = CapabilityCommand<CreateCaseInput, CreateCaseOutput>;
type CloseCaseCommand = CapabilityCommand<CloseCaseInput, CloseCaseOutput>;
type AssignLawyerCommand = CapabilityCommand<AssignLawyerInput, AssignLawyerOutput>;
export declare const createCase: CreateCaseCommand;
export declare const closeCase: CloseCaseCommand;
export declare const assignLawyer: AssignLawyerCommand;
export declare const caseCommands: Readonly<Record<string, CapabilityCommand>>;
export type { CreateCaseCommand, CloseCaseCommand, AssignLawyerCommand };
export declare function nextCaseId(): CaseId;
//# sourceMappingURL=case.commands.d.ts.map